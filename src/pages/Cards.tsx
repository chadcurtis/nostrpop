import { useSeoMeta } from '@unhead/react';
import { CreateCardForm } from '@/components/cards/CreateCardForm';
import { CardList } from '@/components/cards/CardList';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';

const Cards = () => {
  useSeoMeta({
    title: 'POP Cards - Create Beautiful Digital Cards',
    description: 'Create and share beautiful digital cards for any occasion. Choose from various categories and customize your perfect POP card.',
  });

  return (
    <div className="min-h-screen bg-gradient-to-br from-pink-50 via-purple-50 to-indigo-50 dark:from-gray-900 dark:via-purple-900/20 dark:to-indigo-900/20">
      <div className="container mx-auto px-4 py-8">
        {/* Header */}
        <div className="text-center mb-8">
          <h1 className="text-4xl font-bold mb-4 bg-gradient-to-r from-pink-600 via-purple-600 to-indigo-600 bg-clip-text text-transparent">
            POP Cards
          </h1>
          <p className="text-xl text-gray-600 dark:text-gray-300 max-w-2xl mx-auto">
            Good Vibes cards by BitPopArt to share with everyone!
          </p>
        </div>

        {/* Main Content */}
        <Tabs defaultValue="browse" className="w-full">
          <TabsList className="grid w-full grid-cols-3 max-w-lg mx-auto mb-8">
            <TabsTrigger value="browse">All Cards</TabsTrigger>
            <TabsTrigger value="create">Create New</TabsTrigger>
            <TabsTrigger value="my-cards">My Cards</TabsTrigger>
          </TabsList>

          <TabsContent value="browse">
            <div className="max-w-6xl mx-auto">
              <CardList showMyCards={false} />
            </div>
          </TabsContent>

          <TabsContent value="create">
            <Card className="max-w-4xl mx-auto shadow-lg border-0 bg-white/80 dark:bg-gray-800/80 backdrop-blur-sm">
              <CardHeader>
                <CardTitle className="text-2xl text-center">Create Your Perfect POP Card</CardTitle>
                <CardDescription className="text-center">
                  Fill in the details below to create a personalized digital card
                </CardDescription>
              </CardHeader>
              <CardContent>
                <CreateCardForm />
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="my-cards">
            <div className="max-w-6xl mx-auto">
              <CardList showMyCards={true} />
            </div>
          </TabsContent>
        </Tabs>

        {/* Footer */}
        <div className="text-center mt-16 text-sm text-gray-500 dark:text-gray-400">
          <p>Vibed with <a href="https://soapbox.pub/mkstack" className="text-purple-600 hover:text-purple-700 dark:text-purple-400 dark:hover:text-purple-300">MKStack</a></p>
        </div>
      </div>
    </div>
  );
};

export default Cards;