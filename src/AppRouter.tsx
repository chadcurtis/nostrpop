import { BrowserRouter, Route, Routes } from "react-router-dom";
import { ScrollToTop } from "./components/ScrollToTop";
import { Layout } from "./components/Layout";

import Index from "./pages/Index";
import Cards from "./pages/Cards";
import CardView from "./pages/CardView";
import CardPreview from "./pages/CardPreview";
import Art from "./pages/Art";
import ArtworkView from "./pages/ArtworkView";
import Shop from "./pages/Shop";
import Admin from "./pages/Admin";
import Feed from "./pages/Feed";
import { CategoryDemo } from "./pages/CategoryDemo";
import { ProductPage } from "./pages/ProductPage";
import OrderConfirmation from "./pages/OrderConfirmation";
import NotFound from "./pages/NotFound";

export function AppRouter() {
  return (
    <BrowserRouter basename="/nostrpop">
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
          <Route path="/shop" element={<Shop />} />
          <Route path="/admin" element={<Admin />} />
          <Route path="/feed" element={<Feed />} />
          <Route path="/categories" element={<CategoryDemo />} />
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
