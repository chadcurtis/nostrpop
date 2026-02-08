import { BrowserRouter, Route, Routes } from "react-router-dom";
import { ScrollToTop } from "./components/ScrollToTop";
import { Layout } from "./components/Layout";

import Index from "./pages/Index";
import Cards from "./pages/Cards";
import CardView from "./pages/CardView";
import CardPreview from "./pages/CardPreview";
import Art from "./pages/Art";
import ArtworkView from "./pages/ArtworkView";
import Art21K from "./pages/Art21K";
import Shop from "./pages/Shop";
import Admin from "./pages/Admin";
import Feed from "./pages/Feed";
import Canvas100M from "./pages/Canvas100M";
import Blog from "./pages/Blog";
import BlogPost from "./pages/BlogPost";
import PopUp from "./pages/PopUp";
import Artist from "./pages/Artist";
import Projects from "./pages/Projects";
import NostrProjects from "./pages/NostrProjects";
import NostrProjectView from "./pages/NostrProjectView";
import { CategoryDemo } from "./pages/CategoryDemo";
import { ProductPage } from "./pages/ProductPage";
import { DeleteProductPage } from "./pages/DeleteProductPage";
import OrderConfirmation from "./pages/OrderConfirmation";
import NotFound from "./pages/NotFound";

export function AppRouter() {
  // Use the base URL that Vite injects based on build config
  const basename = import.meta.env.BASE_URL;
  
  return (
    <BrowserRouter basename={basename}>
      <ScrollToTop />
      <Layout>
        <Routes>
          <Route path="/" element={<Index />} />
          <Route path="/cards" element={<Cards />} />
          <Route path="/cards/create" element={<Cards />} />
          <Route path="/card/:nip19" element={<CardView />} />
          <Route path="/share/:nip19" element={<CardPreview />} />
          <Route path="/art" element={<Art />} />
          <Route path="/art/:naddr" element={<ArtworkView />} />
          <Route path="/21k-art" element={<Art21K />} />
          <Route path="/canvas" element={<Canvas100M />} />
          <Route path="/shop" element={<Shop />} />
          <Route path="/admin" element={<Admin />} />
          <Route path="/feed" element={<Feed />} />
          <Route path="/blog" element={<Blog />} />
          <Route path="/blog/:articleId" element={<BlogPost />} />
          <Route path="/popup" element={<PopUp />} />
          <Route path="/artist" element={<Artist />} />
          <Route path="/projects" element={<Projects />} />
          <Route path="/nostr-projects" element={<NostrProjects />} />
          <Route path="/nostr-projects/:projectId" element={<NostrProjectView />} />
          <Route path="/categories" element={<CategoryDemo />} />
          <Route path="/shop/:productId/delete" element={<DeleteProductPage />} />
          <Route path="/shop/:productId" element={<ProductPage />} />
          <Route path="/order-confirmation" element={<OrderConfirmation />} />
          {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
          <Route path="*" element={<NotFound />} />
        </Routes>
      </Layout>
    </BrowserRouter>
  );
}
export default AppRouter;
