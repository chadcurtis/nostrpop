import { useState } from 'react';
import { useSeoMeta } from '@unhead/react';
import { useCurrentUser } from '@/hooks/useCurrentUser';
import { useNavigate } from 'react-router-dom';
import { useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { LoginArea } from '@/components/auth/LoginArea';
import { CardManagement } from '@/components/cards/CardManagement';
import { ProductManagement } from '@/components/marketplace/ProductManagement';
import { CategoryManagement } from '@/components/marketplace/CategoryManagement';
import { FundraiserManagement } from '@/components/fundraiser/FundraiserManagement';
import { BlogPostManagement } from '@/components/blog/BlogPostManagement';
import { PopUpManagement } from '@/components/popup/PopUpManagement';
import { ArtistContentManagement } from '@/components/artist/ArtistContentManagement';
import { ProjectManagement } from '@/components/projects/ProjectManagement';
import { NostrProjectManagement } from '@/components/nostrprojects/NostrProjectManagement';
import { PageManagement } from '@/components/pages/PageManagement';
import { SocialMediaManagement } from '@/components/social/SocialMediaManagement';
import { NewsletterManager } from '@/components/newsletter/NewsletterManager';
import { AnalyticsSettings } from '@/components/analytics/AnalyticsSettings';
import { useIsAdmin } from '@/hooks/useIsAdmin';
import {
  Plus,
  FolderOpen,
  BarChart3,
  Settings,
  Users,
  Shield,
  Sparkles,
  ArrowRight,
  TrendingUp,
  Eye,
  Edit,
  Database,
  Palette,
  ShoppingBag,
  Tags,
  CreditCard,
  Grid3X3,
  FileText,
  MapPin,
  User,
  FolderKanban,
  Award,
  Share2,
  Mail,
  Target
} from 'lucide-react';

const Admin = () => {
  const { user } = useCurrentUser();
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState('overview');

  // Check if current user is admin
  const isAdmin = useIsAdmin();

  useSeoMeta({
    title: 'Admin Dashboard - BitPopArt',
    description: 'Administrative dashboard for managing BitPopArt platform.',
  });

  useEffect(() => {
    // Redirect non-admin users to cards page
    if (user && !isAdmin) {
      navigate('/cards');
    }
  }, [user, isAdmin, navigate]);

  // Show login prompt if not logged in
  if (!user) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-pink-50 via-purple-50 to-indigo-50 dark:from-gray-900 dark:via-purple-900/20 dark:to-indigo-900/20 flex items-center justify-center">
        <Card className="max-w-md mx-auto">
          <CardHeader className="text-center">
            <Shield className="h-12 w-12 mx-auto mb-4 text-purple-600" />
            <CardTitle className="text-2xl">Admin Access Required</CardTitle>
            <CardDescription>
              Please log in with your admin account to access the dashboard.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <LoginArea className="w-full" />
          </CardContent>
        </Card>
      </div>
    );
  }

  // Show access denied if not admin
  if (!isAdmin) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-pink-50 via-purple-50 to-indigo-50 dark:from-gray-900 dark:via-purple-900/20 dark:to-indigo-900/20 flex items-center justify-center">
        <Card className="max-w-md mx-auto border-red-200 dark:border-red-800">
          <CardHeader className="text-center">
            <Shield className="h-12 w-12 mx-auto mb-4 text-red-500" />
            <CardTitle className="text-2xl text-red-600 dark:text-red-400">Access Denied</CardTitle>
            <CardDescription>
              You don't have permission to access the admin dashboard.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Button
              onClick={() => navigate('/cards')}
              className="w-full"
              variant="outline"
            >
              Go to Cards
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  const projectsActions = [
    {
      title: 'Projects Portfolio',
      description: 'Showcase creative projects',
      icon: FolderKanban,
      color: 'from-orange-500 to-red-500',
      action: () => setActiveTab('projects'),
      badge: 'Projects'
    },
    {
      title: 'Nostr Projects',
      description: 'Collaborative art projects',
      icon: Users,
      color: 'from-purple-500 to-indigo-500',
      action: () => setActiveTab('nostr-projects'),
      badge: 'Collab'
    },
    {
      title: 'Fundraising',
      description: 'Crowdfunding campaigns',
      icon: Target,
      color: 'from-green-500 to-teal-500',
      action: () => setActiveTab('fundraisers'),
      badge: 'Fundraising'
    },
  ];

  const bitpopcardsActions = [
    {
      title: 'POP Cards',
      description: 'Create and share digital cards',
      icon: CreditCard,
      color: 'from-violet-500 to-purple-500',
      action: () => setActiveTab('cards'),
      badge: 'Cards'
    },
    {
      title: 'Art Gallery',
      description: 'Manage artwork sales and auctions',
      icon: Palette,
      color: 'from-pink-500 to-rose-500',
      action: () => navigate('/art'),
      badge: 'Gallery'
    },
    {
      title: 'Shop Products',
      description: 'Marketplace product management',
      icon: ShoppingBag,
      color: 'from-amber-500 to-orange-500',
      action: () => setActiveTab('shop'),
      badge: 'Shop'
    },
  ];

  const contentActions = [
    {
      title: 'News Articles',
      description: 'Publish news and blog posts',
      icon: FileText,
      color: 'from-blue-500 to-cyan-500',
      action: () => setActiveTab('blog'),
      badge: 'News'
    },
    {
      title: 'Artist Page',
      description: 'Update your artist bio and story',
      icon: User,
      color: 'from-purple-500 to-pink-500',
      action: () => setActiveTab('artist'),
      badge: 'Bio'
    },
    {
      title: 'PopUp Events',
      description: 'Manage worldwide event schedule',
      icon: MapPin,
      color: 'from-green-500 to-emerald-500',
      action: () => setActiveTab('popup'),
      badge: 'Events'
    },
    {
      title: 'Custom Pages',
      description: 'Create general pages with galleries',
      icon: FileText,
      color: 'from-teal-500 to-cyan-500',
      action: () => setActiveTab('pages'),
      badge: 'Pages'
    },
    {
      title: 'Social Media',
      description: 'Manage footer social links',
      icon: Share2,
      color: 'from-blue-500 to-indigo-500',
      action: () => setActiveTab('social'),
      badge: 'Social'
    },
    {
      title: 'Newsletter',
      description: 'Compose and send newsletters',
      icon: Mail,
      color: 'from-pink-500 to-rose-500',
      action: () => setActiveTab('newsletter'),
      badge: 'Email'
    },
    {
      title: 'Analytics',
      description: 'Track site visitors',
      icon: BarChart3,
      color: 'from-indigo-500 to-purple-500',
      action: () => setActiveTab('analytics'),
      badge: 'Stats'
    },
  ];

  const statsCards = [
    {
      title: 'Platform',
      value: 'BitPopArt',
      description: 'On Nostr Network',
      icon: Sparkles,
      color: 'text-purple-600'
    },
    {
      title: 'Sections',
      value: '8',
      description: 'Content areas',
      icon: Grid3X3,
      color: 'text-blue-600'
    },
    {
      title: 'Decentralized',
      value: '100%',
      description: 'On Nostr',
      icon: TrendingUp,
      color: 'text-green-600'
    }
  ];

  return (
    <div className="min-h-screen bg-gradient-to-br from-pink-50 via-purple-50 to-indigo-50 dark:from-gray-900 dark:via-purple-900/20 dark:to-indigo-900/20">
      <div className="container mx-auto px-4 py-8">
        {/* Header */}
        <div className="text-center mb-8">
          <div className="flex items-center justify-center mb-4">
            <Shield className="h-8 w-8 text-purple-600 mr-3" />
            <h1 className="text-4xl font-bold bg-gradient-to-r from-pink-600 via-purple-600 to-indigo-600 bg-clip-text text-transparent">
              Admin Dashboard
            </h1>
          </div>
          <p className="text-xl text-gray-600 dark:text-gray-300 max-w-2xl mx-auto">
            Welcome back! Manage your BitPopArt platform from here.
          </p>
          <Badge className="mt-4 bg-gradient-to-r from-purple-500 to-pink-500 text-white border-0">
            Administrator Access
          </Badge>
        </div>

        {/* Quick Stats */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          {statsCards.map((stat, index) => (
            <Card key={index} className="bg-white/80 dark:bg-gray-800/80 backdrop-blur-sm border-0 shadow-lg">
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-muted-foreground">{stat.title}</p>
                    <p className="text-2xl font-bold">{stat.value}</p>
                    <p className="text-xs text-muted-foreground">{stat.description}</p>
                  </div>
                  <stat.icon className={`h-8 w-8 ${stat.color}`} />
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Admin Tabs */}
        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <TabsList className="grid w-full grid-cols-2 md:grid-cols-7 lg:grid-cols-14 max-w-7xl mx-auto mb-8 text-xs">
            <TabsTrigger value="overview">Overview</TabsTrigger>
            <TabsTrigger value="blog">News</TabsTrigger>
            <TabsTrigger value="artist">Artist</TabsTrigger>
            <TabsTrigger value="popup">PopUp</TabsTrigger>
            <TabsTrigger value="pages">Pages</TabsTrigger>
            <TabsTrigger value="social">Social</TabsTrigger>
            <TabsTrigger value="newsletter">Newsletter</TabsTrigger>
            <TabsTrigger value="analytics">Analytics</TabsTrigger>
            <TabsTrigger value="projects">Projects</TabsTrigger>
            <TabsTrigger value="nostr-projects">Nostr</TabsTrigger>
            <TabsTrigger value="fundraisers">Fundraisers</TabsTrigger>
            <TabsTrigger value="cards">Cards</TabsTrigger>
            <TabsTrigger value="shop">Shop</TabsTrigger>
            <TabsTrigger value="art">Art</TabsTrigger>
          </TabsList>

          <TabsContent value="overview" className="space-y-8">
            {/* Quick Actions Overview */}
            <div className="space-y-8">
              {/* Projects Section */}
              <div>
                <h2 className="text-2xl font-semibold mb-6 text-center">Projects</h2>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6 max-w-5xl mx-auto">
                  {projectsActions.map((action, index) => (
                    <Card
                      key={index}
                      className="group hover:shadow-xl transition-all duration-300 cursor-pointer bg-white/80 dark:bg-gray-800/80 backdrop-blur-sm border-0 shadow-lg"
                      onClick={action.action}
                    >
                      <CardHeader className="pb-4">
                        <div className="flex items-center justify-between">
                          <div className={`p-3 rounded-lg bg-gradient-to-r ${action.color} text-white`}>
                            <action.icon className="h-6 w-6" />
                          </div>
                          <Badge variant="secondary" className="text-xs">
                            {action.badge}
                          </Badge>
                        </div>
                        <CardTitle className="text-lg group-hover:text-purple-600 transition-colors">
                          {action.title}
                        </CardTitle>
                        <CardDescription className="text-sm">
                          {action.description}
                        </CardDescription>
                      </CardHeader>
                      <CardContent className="pt-0">
                        <div className="flex items-center text-purple-600 group-hover:text-purple-700 transition-colors">
                          <span className="text-sm font-medium">Manage</span>
                          <ArrowRight className="h-4 w-4 ml-2 group-hover:translate-x-1 transition-transform" />
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              </div>

              {/* BitPopCards Section */}
              <div>
                <h2 className="text-2xl font-semibold mb-6 text-center">BitPopCards</h2>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 max-w-6xl mx-auto">
                  {bitpopcardsActions.map((action, index) => (
                    <Card
                      key={index}
                      className="group hover:shadow-xl transition-all duration-300 cursor-pointer bg-white/80 dark:bg-gray-800/80 backdrop-blur-sm border-0 shadow-lg"
                      onClick={action.action}
                    >
                      <CardHeader className="pb-4">
                        <div className="flex items-center justify-between">
                          <div className={`p-3 rounded-lg bg-gradient-to-r ${action.color} text-white`}>
                            <action.icon className="h-6 w-6" />
                          </div>
                          <Badge variant="secondary" className="text-xs">
                            {action.badge}
                          </Badge>
                        </div>
                        <CardTitle className="text-lg group-hover:text-purple-600 transition-colors">
                          {action.title}
                        </CardTitle>
                        <CardDescription className="text-sm">
                          {action.description}
                        </CardDescription>
                      </CardHeader>
                      <CardContent className="pt-0">
                        <div className="flex items-center text-purple-600 group-hover:text-purple-700 transition-colors">
                          <span className="text-sm font-medium">Manage</span>
                          <ArrowRight className="h-4 w-4 ml-2 group-hover:translate-x-1 transition-transform" />
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              </div>

              {/* Content Management Section */}
              <div>
                <h2 className="text-2xl font-semibold mb-6 text-center">Content Management</h2>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-7 gap-6 max-w-7xl mx-auto">
                  {contentActions.map((action, index) => (
                    <Card
                      key={index}
                      className="group hover:shadow-xl transition-all duration-300 cursor-pointer bg-white/80 dark:bg-gray-800/80 backdrop-blur-sm border-0 shadow-lg"
                      onClick={action.action}
                    >
                      <CardHeader className="pb-4">
                        <div className="flex items-center justify-between">
                          <div className={`p-3 rounded-lg bg-gradient-to-r ${action.color} text-white`}>
                            <action.icon className="h-6 w-6" />
                          </div>
                          <Badge variant="secondary" className="text-xs">
                            {action.badge}
                          </Badge>
                        </div>
                        <CardTitle className="text-lg group-hover:text-purple-600 transition-colors">
                          {action.title}
                        </CardTitle>
                        <CardDescription className="text-sm">
                          {action.description}
                        </CardDescription>
                      </CardHeader>
                      <CardContent className="pt-0">
                        <div className="flex items-center text-purple-600 group-hover:text-purple-700 transition-colors">
                          <span className="text-sm font-medium">Manage</span>
                          <ArrowRight className="h-4 w-4 ml-2 group-hover:translate-x-1 transition-transform" />
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              </div>

              {/* Quick Links Section */}
              <div>
                <h2 className="text-2xl font-semibold mb-6 text-center">Quick Access</h2>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 max-w-4xl mx-auto">
                  <Button
                    variant="outline"
                    className="h-24 flex flex-col items-center justify-center gap-2 hover:bg-purple-50 dark:hover:bg-purple-900/20"
                    onClick={() => navigate('/art')}
                  >
                    <Palette className="h-6 w-6 text-purple-600" />
                    <span className="text-sm font-medium">View Gallery</span>
                  </Button>
                  <Button
                    variant="outline"
                    className="h-24 flex flex-col items-center justify-center gap-2 hover:bg-pink-50 dark:hover:bg-pink-900/20"
                    onClick={() => navigate('/projects')}
                  >
                    <FolderKanban className="h-6 w-6 text-pink-600" />
                    <span className="text-sm font-medium">View Projects</span>
                  </Button>
                  <Button
                    variant="outline"
                    className="h-24 flex flex-col items-center justify-center gap-2 hover:bg-green-50 dark:hover:bg-green-900/20"
                    onClick={() => navigate('/popup')}
                  >
                    <MapPin className="h-6 w-6 text-green-600" />
                    <span className="text-sm font-medium">View Events</span>
                  </Button>
                  <Button
                    variant="outline"
                    className="h-24 flex flex-col items-center justify-center gap-2 hover:bg-teal-50 dark:hover:bg-teal-900/20"
                    onClick={() => navigate('/shop?tab=fundraisers')}
                  >
                    <Target className="h-6 w-6 text-teal-600" />
                    <span className="text-sm font-medium">Fundraising</span>
                  </Button>
                </div>
              </div>
            </div>
          </TabsContent>

          <TabsContent value="blog">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center">
                  <FileText className="h-6 w-6 mr-2" />
                  News Management
                </CardTitle>
                <CardDescription>
                  Import WordPress articles and manage your news posts on Nostr
                </CardDescription>
              </CardHeader>
              <CardContent>
                <BlogPostManagement />
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="artist">
            <ArtistContentManagement />
          </TabsContent>

          <TabsContent value="projects">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center">
                  <FolderKanban className="h-6 w-6 mr-2" />
                  Projects Management
                </CardTitle>
                <CardDescription>
                  Create and manage your project portfolio
                </CardDescription>
              </CardHeader>
              <CardContent>
                <ProjectManagement />
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="nostr-projects">
            <NostrProjectManagement />
          </TabsContent>

          <TabsContent value="pages">
            <PageManagement />
          </TabsContent>

          <TabsContent value="social">
            <SocialMediaManagement />
          </TabsContent>

          <TabsContent value="newsletter">
            <NewsletterManager />
          </TabsContent>

          <TabsContent value="analytics">
            <AnalyticsSettings />
          </TabsContent>

          <TabsContent value="popup">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center">
                  <MapPin className="h-6 w-6 mr-2" />
                  PopUp Events Management
                </CardTitle>
                <CardDescription>
                  Create and manage your worldwide PopUp events schedule
                </CardDescription>
              </CardHeader>
              <CardContent>
                <PopUpManagement />
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="cards">
            <CardManagement />
          </TabsContent>

          <TabsContent value="shop">
            <ProductManagement />
          </TabsContent>

          <TabsContent value="fundraisers">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center">
                  <Target className="h-6 w-6 mr-2" />
                  Fundraiser Management
                </CardTitle>
                <CardDescription>
                  Create and manage crowdfunding campaigns for art projects
                </CardDescription>
              </CardHeader>
              <CardContent>
                <FundraiserManagement />
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="art">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center">
                  <Palette className="h-6 w-6 mr-2" />
                  Artwork Management
                </CardTitle>
                <CardDescription>
                  Manage your artwork gallery and listings
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="text-center py-12">
                  <Palette className="h-16 w-16 mx-auto text-purple-300 mb-4" />
                  <h3 className="text-xl font-semibold mb-2">Artwork Manager</h3>
                  <p className="text-muted-foreground mb-6">
                    Create, edit, and manage your artworks from the Art page
                  </p>
                  <div className="flex flex-col sm:flex-row gap-4 justify-center">
                    <Button onClick={() => navigate('/art')} size="lg">
                      <Palette className="mr-2 h-5 w-5" />
                      Go to Art Gallery
                    </Button>
                    <Button onClick={() => navigate('/art?action=create')} size="lg" variant="outline">
                      <Plus className="mr-2 h-5 w-5" />
                      Create New Artwork
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

        </Tabs>

        {/* Platform Info */}
        <Card className="max-w-6xl mx-auto bg-gradient-to-r from-purple-100 to-pink-100 dark:from-purple-900/30 dark:to-pink-900/30 border-0">
          <CardContent className="p-8">
            <div className="text-center mb-6">
              <div className="flex items-center justify-center mb-4">
                <Sparkles className="h-8 w-8 text-purple-600 mr-2" />
                <h2 className="text-2xl font-bold">BitPopArt Platform</h2>
              </div>
              <p className="text-lg mb-6 text-muted-foreground">
                Bitcoin PopArt meets Nostr - Decentralized creativity and commerce
              </p>
            </div>
            
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
              <Button
                onClick={() => navigate('/art')}
                size="lg"
                variant="outline"
                className="h-auto py-4 flex-col gap-2"
              >
                <Palette className="h-6 w-6 text-purple-600" />
                <div className="text-center">
                  <div className="font-semibold">Art Gallery</div>
                  <div className="text-xs text-muted-foreground">Browse & Sell</div>
                </div>
              </Button>
              <Button
                onClick={() => navigate('/projects')}
                size="lg"
                variant="outline"
                className="h-auto py-4 flex-col gap-2"
              >
                <FolderKanban className="h-6 w-6 text-pink-600" />
                <div className="text-center">
                  <div className="font-semibold">Projects</div>
                  <div className="text-xs text-muted-foreground">Portfolio</div>
                </div>
              </Button>
              <Button
                onClick={() => navigate('/popup')}
                size="lg"
                variant="outline"
                className="h-auto py-4 flex-col gap-2"
              >
                <MapPin className="h-6 w-6 text-green-600" />
                <div className="text-center">
                  <div className="font-semibold">PopUp Events</div>
                  <div className="text-xs text-muted-foreground">Worldwide</div>
                </div>
              </Button>
              <Button
                onClick={() => navigate('/shop')}
                size="lg"
                variant="outline"
                className="h-auto py-4 flex-col gap-2"
              >
                <ShoppingBag className="h-6 w-6 text-orange-600" />
                <div className="text-center">
                  <div className="font-semibold">Shop</div>
                  <div className="text-xs text-muted-foreground">Marketplace</div>
                </div>
              </Button>
              <Button
                onClick={() => navigate('/cards')}
                size="lg"
                variant="outline"
                className="h-auto py-4 flex-col gap-2"
              >
                <CreditCard className="h-6 w-6 text-violet-600" />
                <div className="text-center">
                  <div className="font-semibold">POP Cards</div>
                  <div className="text-xs text-muted-foreground">Good Vibes</div>
                </div>
              </Button>
              <Button
                onClick={() => navigate('/artist')}
                size="lg"
                variant="outline"
                className="h-auto py-4 flex-col gap-2"
              >
                <User className="h-6 w-6 text-blue-600" />
                <div className="text-center">
                  <div className="font-semibold">Artist Page</div>
                  <div className="text-xs text-muted-foreground">Your Story</div>
                </div>
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Footer */}
        <div className="text-center mt-16 text-sm text-gray-500 dark:text-gray-400">
          <p>Nostr & BitPopArt {new Date().getFullYear()}</p>
        </div>
      </div>
    </div>
  );
};

export default Admin;