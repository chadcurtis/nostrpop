import { useSeoMeta } from '@unhead/react';
import { useFundraisers } from '@/hooks/useFundraisers';
import { FundraiserCard } from '@/components/fundraiser/FundraiserCard';
import { Card, CardContent } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { RelaySelector } from '@/components/RelaySelector';
import { Target, Sparkles } from 'lucide-react';

export default function Fundraising() {
  const { data: fundraisers = [], isLoading } = useFundraisers();

  // Filter active fundraisers
  const activeFundraisers = fundraisers.filter(f => f.status === 'active');
  const completedFundraisers = fundraisers.filter(f => f.status === 'completed');

  useSeoMeta({
    title: 'Fundraising - BitPopArt',
    description: 'Support BitPopArt projects through crowdfunding. Contribute with Bitcoin Lightning.',
  });

  return (
    <div className="min-h-screen bg-gradient-to-br from-pink-50 via-purple-50 to-indigo-50 dark:from-gray-900 dark:via-purple-900/20 dark:to-indigo-900/20">
      <div className="container mx-auto px-4 py-12">
        {/* Header */}
        <div className="text-center mb-12">
          <div className="flex items-center justify-center mb-4">
            <Target className="h-10 w-10 text-purple-600 mr-3" />
            <h1 className="text-5xl font-bold bg-gradient-to-r from-pink-600 via-purple-600 to-indigo-600 bg-clip-text text-transparent">
              Fundraising
            </h1>
          </div>
          <p className="text-xl text-gray-600 dark:text-gray-300 max-w-2xl mx-auto">
            Support art projects with Bitcoin Lightning. Help bring creative visions to life.
          </p>
        </div>

        {/* Loading State */}
        {isLoading && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 max-w-6xl mx-auto">
            {[...Array(2)].map((_, i) => (
              <Card key={i} className="overflow-hidden">
                <Skeleton className="aspect-video w-full" />
                <div className="p-6 space-y-4">
                  <Skeleton className="h-8 w-3/4" />
                  <Skeleton className="h-4 w-full" />
                  <Skeleton className="h-4 w-5/6" />
                  <Skeleton className="h-3 w-full" />
                  <Skeleton className="h-24 w-full" />
                  <Skeleton className="h-12 w-full" />
                </div>
              </Card>
            ))}
          </div>
        )}

        {/* Active Fundraisers */}
        {!isLoading && activeFundraisers.length > 0 && (
          <div className="mb-12">
            <h2 className="text-2xl font-bold mb-6 flex items-center gap-2">
              <Sparkles className="h-6 w-6 text-purple-600" />
              Active Campaigns
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 max-w-6xl mx-auto">
              {activeFundraisers.map((fundraiser) => (
                <FundraiserCard key={fundraiser.id} fundraiser={fundraiser} />
              ))}
            </div>
          </div>
        )}

        {/* Completed Fundraisers */}
        {!isLoading && completedFundraisers.length > 0 && (
          <div className="mb-12">
            <h2 className="text-2xl font-bold mb-6 flex items-center gap-2">
              <Target className="h-6 w-6 text-green-600" />
              Completed Campaigns
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 max-w-6xl mx-auto">
              {completedFundraisers.map((fundraiser) => (
                <FundraiserCard key={fundraiser.id} fundraiser={fundraiser} />
              ))}
            </div>
          </div>
        )}

        {/* Empty State */}
        {!isLoading && fundraisers.length === 0 && (
          <div className="col-span-full">
            <Card className="border-dashed">
              <CardContent className="py-12 px-8 text-center">
                <div className="max-w-sm mx-auto space-y-6">
                  <Target className="h-16 w-16 mx-auto text-muted-foreground" />
                  <div>
                    <h3 className="text-lg font-semibold mb-2">No Active Fundraisers</h3>
                    <p className="text-muted-foreground mb-6">
                      Check back soon for new crowdfunding campaigns, or try another relay.
                    </p>
                  </div>
                  <RelaySelector className="w-full" />
                </div>
              </CardContent>
            </Card>
          </div>
        )}

        {/* Footer */}
        <div className="text-center mt-16 text-sm text-gray-500 dark:text-gray-400">
          <p>Powered by Nostr & Bitcoin Lightning ⚡</p>
        </div>
      </div>
    </div>
  );
}
