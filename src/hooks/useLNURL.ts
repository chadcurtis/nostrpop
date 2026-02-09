import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useToast } from '@/hooks/useToast';

interface LNURLPayResponse {
  callback: string;
  maxSendable: number;
  minSendable: number;
  metadata: string;
  allowsNostr?: boolean;
  nostrPubkey?: string;
  tag: string;
}

interface LNURLInvoiceResponse {
  pr: string; // Lightning invoice
  successAction?: {
    tag: string;
    message?: string;
    url?: string;
  };
}

// Convert lightning address to LNURL
function lightningAddressToLNURL(address: string): string {
  const [username, domain] = address.split('@');
  if (!username || !domain) {
    throw new Error('Invalid lightning address format');
  }

  const url = `https://${domain}/.well-known/lnurlp/${username}`;
  return url;
}

// Fetch LNURL pay data
async function fetchLNURLPay(lnurlOrAddress: string): Promise<LNURLPayResponse> {
  let url: string;

  if (lnurlOrAddress.includes('@')) {
    // Lightning address
    url = lightningAddressToLNURL(lnurlOrAddress);
    console.log('Resolved Lightning address to LNURL:', url);
  } else if (lnurlOrAddress.startsWith('lnurl')) {
    // LNURL (would need to decode bech32, but for simplicity we'll handle addresses)
    throw new Error('LNURL bech32 format not implemented. Please use lightning address.');
  } else {
    // Assume it's already a URL
    url = lnurlOrAddress;
  }

  console.log('Fetching LNURL data from:', url);

  const response = await fetch(url);
  console.log('LNURL response status:', response.status, response.statusText);

  if (!response.ok) {
    const errorText = await response.text();
    console.error('LNURL fetch failed:', response.status, response.statusText, errorText);
    throw new Error(`Failed to fetch LNURL data: ${response.status} ${response.statusText}`);
  }

  const responseText = await response.text();
  console.log('LNURL response text:', responseText);

  let data;
  try {
    data = JSON.parse(responseText);
  } catch (parseError) {
    console.error('Failed to parse LNURL response as JSON:', parseError);
    throw new Error(`Invalid JSON response from LNURL endpoint: ${responseText}`);
  }

  console.log('Parsed LNURL data:', data);

  if (data.tag !== 'payRequest') {
    throw new Error(`Invalid LNURL response: expected tag 'payRequest', got '${data.tag}'`);
  }

  return data;
}

// Request invoice from LNURL callback
async function requestInvoice(
  callback: string,
  amount: number, // in millisats
  nostrEvent?: string,
  lnurl?: string
): Promise<LNURLInvoiceResponse> {
  const url = new URL(callback);
  url.searchParams.set('amount', amount.toString());

  if (nostrEvent) {
    url.searchParams.set('nostr', encodeURIComponent(nostrEvent));
  }

  if (lnurl) {
    url.searchParams.set('lnurl', lnurl);
  }

  console.log('Requesting invoice from callback:', url.toString());

  const response = await fetch(url.toString());
  console.log('Invoice response status:', response.status, response.statusText);

  if (!response.ok) {
    const errorText = await response.text();
    console.error('Invoice request failed:', response.status, response.statusText, errorText);
    throw new Error(`Failed to request invoice: ${response.status} ${response.statusText}`);
  }

  const responseText = await response.text();
  console.log('Invoice response text:', responseText);

  let data;
  try {
    data = JSON.parse(responseText);
  } catch (parseError) {
    console.error('Failed to parse invoice response as JSON:', parseError);
    throw new Error(`Invalid JSON response from invoice callback: ${responseText}`);
  }

  console.log('Parsed invoice data:', data);

  if (data.status === 'ERROR') {
    throw new Error(data.reason || 'Unknown error from LNURL service');
  }

  if (!data.pr) {
    throw new Error('No payment request (pr) field in invoice response');
  }

  return data;
}

export function useLNURL(lightningAddress?: string) {
  const { toast } = useToast();
  const [isProcessing, setIsProcessing] = useState(false);

  // Fetch LNURL pay data
  const { data: lnurlData, isLoading, error } = useQuery({
    queryKey: ['lnurl', lightningAddress],
    queryFn: () => lightningAddress ? fetchLNURLPay(lightningAddress) : null,
    enabled: !!lightningAddress,
    staleTime: 5 * 60 * 1000, // 5 minutes
    retry: 2,
  });

  // Check if zaps are supported
  const supportsZaps = lnurlData?.allowsNostr === true && !!lnurlData.nostrPubkey;

  // Get zap invoice
  const getZapInvoice = async (
    amount: number, // in sats
    zapRequest?: string
  ): Promise<string | null> => {
    if (!lnurlData) {
      toast({
        title: "LNURL Not Available",
        description: "Lightning address data not loaded.",
        variant: "destructive"
      });
      return null;
    }

    const amountMsats = amount * 1000;

    // Check amount limits
    if (amountMsats < lnurlData.minSendable || amountMsats > lnurlData.maxSendable) {
      toast({
        title: "Invalid Amount",
        description: `Amount must be between ${Math.ceil(lnurlData.minSendable / 1000)} and ${Math.floor(lnurlData.maxSendable / 1000)} sats.`,
        variant: "destructive"
      });
      return null;
    }

    setIsProcessing(true);

    try {
      const invoiceResponse = await requestInvoice(
        lnurlData.callback,
        amountMsats,
        zapRequest,
        lightningAddress
      );

      if (invoiceResponse.successAction?.message) {
        toast({
          title: "Invoice Generated",
          description: invoiceResponse.successAction.message,
        });
      }

      return invoiceResponse.pr;
    } catch (error) {
      console.error('Failed to get invoice:', error);
      toast({
        title: "Invoice Failed",
        description: error instanceof Error ? error.message : "Failed to generate invoice.",
        variant: "destructive"
      });
      return null;
    } finally {
      setIsProcessing(false);
    }
  };

  // Pay invoice (opens in wallet)
  const payInvoice = async (invoice: string) => {
    try {
      // Try WebLN first
      if (window.webln) {
        await window.webln.enable();
        const result = await window.webln.sendPayment(invoice);

        toast({
          title: "Payment Sent! ⚡",
          description: "Zap sent successfully via WebLN.",
        });

        return result;
      } else {
        // Fallback to lightning: URI
        const lightningUri = `lightning:${invoice}`;
        window.open(lightningUri, '_blank');

        toast({
          title: "Wallet Opened",
          description: "Please complete the payment in your lightning wallet.",
        });

        return null;
      }
    } catch (error) {
      console.error('Payment failed:', error);
      toast({
        title: "Payment Failed",
        description: error instanceof Error ? error.message : "Failed to send payment.",
        variant: "destructive"
      });
      throw error;
    }
  };

  return {
    lnurlData,
    isLoading,
    error,
    supportsZaps,
    isProcessing,
    getZapInvoice,
    payInvoice,
    minSendable: lnurlData ? Math.ceil(lnurlData.minSendable / 1000) : 1,
    maxSendable: lnurlData ? Math.floor(lnurlData.maxSendable / 1000) : 1000000,
  };
}

// WebLN type declarations are in vite-env.d.ts