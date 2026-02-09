import { useQuery } from '@tanstack/react-query';

interface _LivePriceData {
  price: number;
  currency: string;
  priceInSats?: number;
}

export function useLivePrice(sourceUrl?: string, fallbackPrice?: number, fallbackCurrency?: string) {
  return useQuery({
    queryKey: ['live-price', sourceUrl],
    queryFn: async ({ signal }) => {
      if (!sourceUrl) {
        // No source URL, return fallback
        return {
          price: fallbackPrice || 0,
          currency: fallbackCurrency || 'USD',
          priceInSats: undefined
        };
      }

      try {
        // Use CORS proxy to fetch the page
        const corsProxy = 'https://proxy.shakespeare.diy/?url=';
        const response = await fetch(corsProxy + encodeURIComponent(sourceUrl), { signal });
        
        if (!response.ok) {
          throw new Error('Failed to fetch source page');
        }

        const html = await response.text();
        
        // Parse HTML to extract price
        const parser = new DOMParser();
        const doc = parser.parseFromString(html, 'text/html');

        // Extract Open Graph price metadata
        const getMetaContent = (property: string): string | null => {
          const meta = doc.querySelector(`meta[property="${property}"]`) || 
                       doc.querySelector(`meta[name="${property}"]`);
          return meta?.getAttribute('content') || null;
        };

        const priceAmount = getMetaContent('og:price:amount') || getMetaContent('product:price:amount') || '';
        const priceCurrency = getMetaContent('og:price:currency') || getMetaContent('product:price:currency') || 'USD';

        const price = parseFloat(priceAmount) || fallbackPrice || 0;

        // Convert to Sats if it's fiat currency
        let priceInSats: number | undefined;
        if (price > 0 && ['USD', 'EUR', 'GBP', 'SGD'].includes(priceCurrency)) {
          try {
            const btcPriceResponse = await fetch(
              `https://api.coingecko.com/api/v3/simple/price?ids=bitcoin&vs_currencies=${priceCurrency.toLowerCase()}`,
              { signal }
            );
            const btcPriceData = await btcPriceResponse.json();
            const btcPrice = btcPriceData?.bitcoin?.[priceCurrency.toLowerCase()];
            
            if (btcPrice && btcPrice > 0) {
              const priceInBTC = price / btcPrice;
              priceInSats = Math.round(priceInBTC * 100000000);
            }
          } catch (error) {
            console.warn('Failed to convert to sats:', error);
          }
        }

        return {
          price,
          currency: priceCurrency,
          priceInSats
        };
      } catch (error) {
        console.warn('Failed to fetch live price, using fallback:', error);
        // Return fallback on error
        return {
          price: fallbackPrice || 0,
          currency: fallbackCurrency || 'USD',
          priceInSats: undefined
        };
      }
    },
    enabled: !!sourceUrl, // Only fetch if source URL is provided
    staleTime: 300000, // 5 minutes
    refetchInterval: 300000, // Refetch every 5 minutes
    retry: 1, // Only retry once on failure
  });
}
