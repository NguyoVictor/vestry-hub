import { useState } from "react";
import { Helmet } from "react-helmet-async";
import { useParams, useNavigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { motion, AnimatePresence } from "framer-motion";
import { supabase } from "@/integrations/supabase/client";
import { TABLES, COLS } from "@/lib/schema";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import {
  Package, Search, X, Share2, Copy, Filter,
  ShoppingBag, Download, ExternalLink, ChevronLeft,
} from "lucide-react";
import { toast } from "sonner";

const BASE_URL = import.meta.env.VITE_BASE_URL || "http://localhost:8080";

export default function PublicStore() {
  const { tenantId } = useParams<{ tenantId: string }>();
  const navigate = useNavigate();
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [sortBy, setSortBy] = useState<"newest" | "price-low" | "price-high" | "popular">("newest");
  const [selectedProduct, setSelectedProduct] = useState<any>(null);

  // Fetch tenant info
  const { data: tenant } = useQuery({
    queryKey: ["tenant-public", tenantId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from(TABLES.TENANTS)
        .select("id, name, logo, tagline, contact_email, website_url")
        .eq(COLS.ID, tenantId)
        .single();
      if (error) throw error;
      return data;
    },
    enabled: !!tenantId,
    staleTime: 300000,
  });

  // Fetch active products
  const { data: products = [], isLoading } = useQuery({
    queryKey: ["store-products-public", tenantId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from(TABLES.STORE_PRODUCTS)
        .select("*")
        .eq(COLS.TENANT_ID, tenantId)
        .eq("status", "active")
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data || [];
    },
    enabled: !!tenantId,
    staleTime: 60000,
  });

  // Get unique categories
  const categories = Array.from(new Set(products.map((p: any) => p.product_type).filter(Boolean)));

  // Filter and sort products
  const filteredProducts = products
    .filter((p: any) => {
      const matchesSearch = !searchQuery || p.name.toLowerCase().includes(searchQuery.toLowerCase());
      const matchesCategory = !selectedCategory || p.product_type === selectedCategory;
      return matchesSearch && matchesCategory;
    })
    .sort((a: any, b: any) => {
      switch (sortBy) {
        case "price-low":
          return (a.price || 0) - (b.price || 0);
        case "price-high":
          return (b.price || 0) - (a.price || 0);
        case "popular":
          return (b.sales_count || 0) - (a.sales_count || 0);
        case "newest":
        default:
          return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
      }
    });

  function formatPrice(price: number) {
    return new Intl.NumberFormat("en-KE", {
      style: "currency",
      currency: "KES",
    }).format(price);
  }

  function copyLink() {
    const url = `${BASE_URL}/store/${tenantId}`;
    navigator.clipboard.writeText(url);
    toast.success("Store link copied!");
  }

  function shareWhatsApp() {
    const url = `${BASE_URL}/store/${tenantId}`;
    const text = `Check out ${tenant?.name}'s Resource Store!`;
    window.open(`https://wa.me/?text=${encodeURIComponent(text + " " + url)}`, "_blank");
  }

  if (!tenant) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50 dark:bg-slate-900">
        <div className="text-center">
          <Package className="h-16 w-16 text-slate-300 mx-auto mb-4" />
          <p className="text-slate-500">Loading store...</p>
        </div>
      </div>
    );
  }

  return (
    <>
      <Helmet>
        <title>{tenant.name} - Resource Store</title>
        <meta name="description" content={`Browse resources from ${tenant.name}`} />
      </Helmet>

      <div className="min-h-screen bg-slate-50 dark:bg-slate-900">
        {/* Hero Section */}
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="bg-gradient-to-br from-amber-500 via-orange-500 to-amber-600 text-white py-16 px-6"
        >
          <div className="max-w-7xl mx-auto">
            <motion.div
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: 0.5, delay: 0.1 }}
              className="flex items-center gap-4 mb-6"
            >
              {tenant.logo && (
                <motion.img
                  initial={{ opacity: 0, rotate: -10 }}
                  animate={{ opacity: 1, rotate: 0 }}
                  transition={{ duration: 0.5, delay: 0.2 }}
                  src={tenant.logo}
                  alt={tenant.name}
                  className="h-16 w-16 rounded-full bg-white p-2 object-contain"
                />
              )}
              <div>
                <motion.h1
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ duration: 0.5, delay: 0.3 }}
                  className="text-4xl font-bold"
                >
                  {tenant.name}
                </motion.h1>
                {tenant.tagline && (
                  <motion.p
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ duration: 0.5, delay: 0.4 }}
                    className="text-amber-100 mt-1"
                  >
                    {tenant.tagline}
                  </motion.p>
                )}
              </div>
            </motion.div>
            <motion.p
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 0.5 }}
              className="text-lg text-amber-50 max-w-2xl"
            >
              Browse our collection of resources, books, and digital content
            </motion.p>

            {/* Share Buttons */}
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 0.6 }}
              className="flex gap-3 mt-6"
            >
              <motion.div whileTap={{ scale: 0.95 }}>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={copyLink}
                  className="bg-white/10 border-white/20 text-white hover:bg-white/20"
                >
                  <Copy className="h-4 w-4 mr-2" />
                  Copy Link
                </Button>
              </motion.div>
              <motion.div whileTap={{ scale: 0.95 }}>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={shareWhatsApp}
                  className="bg-white/10 border-white/20 text-white hover:bg-white/20"
                >
                  <Share2 className="h-4 w-4 mr-2" />
                  Share
                </Button>
              </motion.div>
            </motion.div>
          </div>
        </motion.div>

        {/* Search & Filter Toolbar */}
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, delay: 0.2 }}
          className="sticky top-0 z-10 bg-white dark:bg-slate-800 border-b border-slate-200 dark:border-slate-700 shadow-sm"
        >
          <div className="max-w-7xl mx-auto px-6 py-4">
            <div className="flex flex-col md:flex-row gap-4">
              {/* Search */}
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                <Input
                  placeholder="Search resources..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-10"
                />
                {searchQuery && (
                  <motion.button
                    initial={{ opacity: 0, scale: 0.8 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0, scale: 0.8 }}
                    onClick={() => setSearchQuery("")}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                  >
                    <X className="h-4 w-4" />
                  </motion.button>
                )}
              </div>

              {/* Sort */}
              <select
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value as any)}
                className="px-4 py-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-sm"
              >
                <option value="newest">Newest First</option>
                <option value="price-low">Price: Low to High</option>
                <option value="price-high">Price: High to Low</option>
                <option value="popular">Most Popular</option>
              </select>
            </div>

            {/* Category Pills */}
            {categories.length > 0 && (
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.4, delay: 0.3 }}
                className="flex gap-2 mt-4 overflow-x-auto pb-2 relative"
              >
                <motion.button
                  whileTap={{ scale: 0.95 }}
                  onClick={() => setSelectedCategory(null)}
                  className={`px-4 py-1.5 rounded-full text-sm font-medium whitespace-nowrap transition-colors relative ${
                    selectedCategory === null
                      ? "bg-amber-500 text-white"
                      : "bg-slate-100 dark:bg-slate-700 text-slate-700 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-600"
                  }`}
                >
                  All
                  {selectedCategory === null && (
                    <motion.div
                      layoutId="categoryPillIndicator"
                      className="absolute inset-0 bg-amber-500 rounded-full -z-10"
                      transition={{ type: "spring", stiffness: 400, damping: 25 }}
                    />
                  )}
                </motion.button>
                {categories.map((cat) => (
                  <motion.button
                    key={cat}
                    whileTap={{ scale: 0.95 }}
                    onClick={() => setSelectedCategory(cat)}
                    className={`px-4 py-1.5 rounded-full text-sm font-medium whitespace-nowrap transition-colors relative ${
                      selectedCategory === cat
                        ? "bg-amber-500 text-white"
                        : "bg-slate-100 dark:bg-slate-700 text-slate-700 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-600"
                    }`}
                  >
                    {cat}
                    {selectedCategory === cat && (
                      <motion.div
                        layoutId="categoryPillIndicator"
                        className="absolute inset-0 bg-amber-500 rounded-full -z-10"
                        transition={{ type: "spring", stiffness: 400, damping: 25 }}
                      />
                    )}
                  </motion.button>
                ))}
              </motion.div>
            )}
          </div>
        </motion.div>

        {/* Products Grid */}
        <div className="max-w-7xl mx-auto px-6 py-8">
          {isLoading ? (
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
              {Array.from({ length: 10 }).map((_, i) => (
                <div key={i} className="bg-white dark:bg-slate-800 rounded-xl p-4 space-y-3 animate-pulse">
                  <div className="aspect-[3/4] bg-slate-200 dark:bg-slate-700 rounded-lg" />
                  <div className="h-4 bg-slate-200 dark:bg-slate-700 rounded w-3/4" />
                  <div className="h-3 bg-slate-200 dark:bg-slate-700 rounded w-1/2" />
                </div>
              ))}
            </div>
          ) : filteredProducts.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-20 text-slate-400">
              <Package className="h-16 w-16 mb-4" />
              <p className="text-lg font-semibold">No resources found</p>
              <p className="text-sm">Try adjusting your search or filters</p>
            </div>
          ) : (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4"
            >
              {filteredProducts.map((product: any) => (
                <motion.div
                  key={product.id}
                  layoutId={`product-${product.id}`}
                  initial={{ opacity: 0, scale: 0.95 }}
                  animate={{ opacity: 1, scale: 1 }}
                  whileHover={{ y: -6, boxShadow: "0 12px 30px rgba(0,0,0,0.12)" }}
                  transition={{ type: "spring", stiffness: 400, damping: 25 }}
                  onClick={() => setSelectedProduct(product)}
                  className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 overflow-hidden cursor-pointer group"
                >
                  {/* Cover Image */}
                  <div className="aspect-[3/4] relative overflow-hidden bg-gradient-to-br from-amber-50 to-orange-50 dark:from-slate-700 dark:to-slate-800">
                    {product.image_urls?.[0] ? (
                      <img
                        src={product.image_urls[0]}
                        alt={product.name}
                        className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center">
                        <Package className="h-16 w-16 text-amber-200 dark:text-slate-600" />
                      </div>
                    )}

                    {/* Badges */}
                    {product.pricing === "free" && (
                      <div className="absolute top-2 left-2">
                        <Badge className="bg-emerald-500 text-white text-xs">FREE</Badge>
                      </div>
                    )}
                    {product.product_type && (
                      <div className="absolute top-2 right-2">
                        <Badge className="bg-slate-900/70 text-white text-xs backdrop-blur-sm">
                          {product.product_type}
                        </Badge>
                      </div>
                    )}
                  </div>

                  {/* Content */}
                  <div className="p-3 space-y-2">
                    <h3 className="font-semibold text-sm text-slate-800 dark:text-slate-100 line-clamp-2 group-hover:text-amber-600 transition-colors">
                      {product.name}
                    </h3>
                    <div className="flex items-center justify-between">
                      <span className="font-bold text-amber-600 dark:text-amber-400 text-sm">
                        {product.pricing === "free" ? "Free" : formatPrice(product.price)}
                      </span>
                      {product.sales_count > 0 && (
                        <span className="text-xs text-slate-500">{product.sales_count} sales</span>
                      )}
                    </div>
                  </div>
                </motion.div>
              ))}
            </motion.div>
          )}
        </div>

        {/* Footer */}
        <div className="bg-white dark:bg-slate-800 border-t border-slate-200 dark:border-slate-700 mt-16">
          <div className="max-w-7xl mx-auto px-6 py-8 text-center space-y-2">
            <p className="text-sm text-slate-600 dark:text-slate-400">
              © {new Date().getFullYear()} {tenant.name}. All rights reserved.
            </p>
            {tenant.website_url && (
              <a
                href={tenant.website_url}
                target="_blank"
                rel="noopener noreferrer"
                className="text-sm text-amber-600 hover:text-amber-700 inline-flex items-center gap-1"
              >
                Visit our website
                <ExternalLink className="h-3 w-3" />
              </a>
            )}
            <p className="text-xs text-slate-400 dark:text-slate-500">
              Powered by Vestry Hub
            </p>
          </div>
        </div>
      </div>

      {/* Product Detail Modal */}
      <AnimatePresence>
        {selectedProduct && (
          <Dialog open={!!selectedProduct} onOpenChange={() => setSelectedProduct(null)}>
            <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto p-0">
              <motion.div
                layoutId={`product-${selectedProduct.id}`}
                className="grid md:grid-cols-2 gap-6 p-6"
              >
                {/* Image */}
                <div className="aspect-[3/4] rounded-xl overflow-hidden bg-gradient-to-br from-amber-50 to-orange-50 dark:from-slate-700 dark:to-slate-800">
                  {selectedProduct.image_urls?.[0] ? (
                    <img
                      src={selectedProduct.image_urls[0]}
                      alt={selectedProduct.name}
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center">
                      <Package className="h-24 w-24 text-amber-200 dark:text-slate-600" />
                    </div>
                  )}
                </div>

                {/* Details */}
                <div className="space-y-4">
                  <div>
                    <h2 className="text-2xl font-bold text-slate-900 dark:text-slate-100">
                      {selectedProduct.name}
                    </h2>
                    <p className="text-3xl font-bold text-amber-600 dark:text-amber-400 mt-2">
                      {selectedProduct.pricing === "free" ? "Free" : formatPrice(selectedProduct.price)}
                    </p>
                  </div>

                  {selectedProduct.short_description && (
                    <p className="text-slate-600 dark:text-slate-400">
                      {selectedProduct.short_description}
                    </p>
                  )}

                  {selectedProduct.description && (
                    <div className="prose prose-sm dark:prose-invert">
                      <p className="text-slate-700 dark:text-slate-300 whitespace-pre-wrap">
                        {selectedProduct.description}
                      </p>
                    </div>
                  )}

                  {/* Badges */}
                  <div className="flex flex-wrap gap-2">
                    <Badge className="bg-slate-100 text-slate-700">
                      {selectedProduct.product_type}
                    </Badge>
                    {selectedProduct.pricing === "free" && (
                      <Badge className="bg-emerald-100 text-emerald-700">Free</Badge>
                    )}
                  </div>

                  {/* Tags */}
                  {selectedProduct.tags && selectedProduct.tags.length > 0 && (
                    <div className="flex flex-wrap gap-2">
                      {selectedProduct.tags.map((tag: string) => (
                        <span
                          key={tag}
                          className="px-2 py-1 rounded-full bg-amber-50 dark:bg-amber-900/20 text-amber-700 dark:text-amber-400 text-xs"
                        >
                          {tag}
                        </span>
                      ))}
                    </div>
                  )}

                  {/* Contact CTA */}
                  <div className="pt-4 border-t border-slate-200 dark:border-slate-700">
                    <p className="text-sm text-slate-600 dark:text-slate-400 mb-3">
                      Interested in this resource? Contact us to purchase.
                    </p>
                    {tenant.contact_email && (
                      <Button
                        className="w-full bg-amber-500 hover:bg-amber-600 text-white"
                        onClick={() => window.location.href = `mailto:${tenant.contact_email}?subject=Interest in ${selectedProduct.name}`}
                      >
                        <ShoppingBag className="h-4 w-4 mr-2" />
                        Contact to Purchase
                      </Button>
                    )}
                  </div>
                </div>
              </motion.div>
            </DialogContent>
          </Dialog>
        )}
      </AnimatePresence>
    </>
  );
}
