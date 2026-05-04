import { useState } from "react";
import { Helmet } from "react-helmet-async";
import { useNavigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useMemberPortal } from "@/contexts/MemberPortalContext";
import { TABLES, COLS } from "@/lib/schema";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { Skeleton } from "@/components/ui/skeleton";
import { motion, AnimatePresence } from "framer-motion";
import {
  Package, Search, X, ShoppingBag, Download,
  ArrowLeft, Star, Gift, Sparkles,
} from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

export default function MemberStore() {
  const member = useMemberPortal();
  const navigate = useNavigate();
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [selectedProduct, setSelectedProduct] = useState<any>(null);

  // Fetch active products for this church
  const { data: products = [], isLoading } = useQuery({
    queryKey: ["member-store-products", member.churchId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from(TABLES.STORE_PRODUCTS)
        .select("*")
        .eq(COLS.TENANT_ID, member.churchId)
        .eq("status", "active")
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data || [];
    },
    staleTime: 60000,
  });

  // Get unique categories
  const categories = Array.from(new Set(products.map((p: any) => p.product_type).filter(Boolean)));

  // Filter products
  const filteredProducts = products.filter((p: any) => {
    const matchesSearch = !searchQuery || p.name.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesCategory = !selectedCategory || p.product_type === selectedCategory;
    return matchesSearch && matchesCategory;
  });

  // Featured products (products with compare_at_price - on sale)
  const featuredProducts = products.filter((p: any) => p.compare_at_price && p.compare_at_price > p.price);

  // Free resources
  const freeProducts = products.filter((p: any) => p.pricing === "free" || p.price === 0);

  function formatPrice(price: number) {
    return new Intl.NumberFormat("en-KE", {
      style: "currency",
      currency: "KES",
    }).format(price);
  }

  function calculateDiscount(price: number, comparePrice: number) {
    if (!comparePrice || comparePrice <= price) return 0;
    return Math.round(((comparePrice - price) / comparePrice) * 100);
  }

  return (
    <>
      <Helmet>
        <title>Resource Store — {member.churchName}</title>
      </Helmet>

      <div className="max-w-2xl mx-auto pb-6">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4 }}
          className="flex items-center gap-3 mb-4"
        >
          <motion.button
            whileTap={{ scale: 0.9 }}
            onClick={() => navigate("/member")}
            className="h-8 w-8 flex items-center justify-center rounded-full hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
          >
            <ArrowLeft className="h-4 w-4 text-slate-600 dark:text-slate-400" />
          </motion.button>
          <div>
            <p className="text-xs font-medium text-slate-500 dark:text-slate-400">{member.churchName}</p>
            <h1 className="text-lg font-bold text-slate-900 dark:text-white leading-tight flex items-center gap-1.5">
              <ShoppingBag className="h-4 w-4 text-amber-500" />
              Resource Store
            </h1>
          </div>
        </motion.div>

        {/* Search */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, delay: 0.1 }}
          className="relative mb-4"
        >
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
          <Input
            placeholder="Search resources..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10 h-10 bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800"
          />
          {searchQuery && (
            <motion.button
              initial={{ opacity: 0, scale: 0.8 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.8 }}
              whileTap={{ scale: 0.9 }}
              onClick={() => setSearchQuery("")}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
            >
              <X className="h-4 w-4" />
            </motion.button>
          )}
        </motion.div>

        {/* Category Pills */}
        {categories.length > 0 && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4, delay: 0.2 }}
            className="flex gap-2 mb-5 overflow-x-auto pb-2 relative"
          >
            <motion.button
              whileTap={{ scale: 0.95 }}
              onClick={() => setSelectedCategory(null)}
              className={cn(
                "px-3 py-1.5 rounded-full text-xs font-medium whitespace-nowrap transition-colors relative",
                selectedCategory === null
                  ? "bg-amber-500 text-white"
                  : "bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700"
              )}
            >
              All
              {selectedCategory === null && (
                <motion.div
                  layoutId="memberCategoryIndicator"
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
                className={cn(
                  "px-3 py-1.5 rounded-full text-xs font-medium whitespace-nowrap transition-colors relative",
                  selectedCategory === cat
                    ? "bg-amber-500 text-white"
                    : "bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700"
                )}
              >
                {cat}
                {selectedCategory === cat && (
                  <motion.div
                    layoutId="memberCategoryIndicator"
                    className="absolute inset-0 bg-amber-500 rounded-full -z-10"
                    transition={{ type: "spring", stiffness: 400, damping: 25 }}
                  />
                )}
              </motion.button>
            ))}
          </motion.div>
        )}

        {/* Featured Section */}
        {!searchQuery && !selectedCategory && featuredProducts.length > 0 && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4, delay: 0.3 }}
            className="mb-6"
          >
            <div className="flex items-center gap-2 mb-3">
              <Star className="h-4 w-4 text-amber-500" />
              <h2 className="text-sm font-semibold text-slate-900 dark:text-white">Featured</h2>
            </div>
            <div className="grid grid-cols-2 gap-3">
              {featuredProducts.slice(0, 4).map((product: any, index: number) => {
                const discount = calculateDiscount(product.price, product.compare_at_price);
                return (
                  <motion.div
                    key={product.id}
                    initial={{ opacity: 0, scale: 0.9 }}
                    animate={{ opacity: 1, scale: 1 }}
                    transition={{ duration: 0.3, delay: 0.4 + index * 0.05 }}
                    whileTap={{ scale: 0.97 }}
                    onClick={() => setSelectedProduct(product)}
                    className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 overflow-hidden cursor-pointer"
                  >
                    {/* Cover Image */}
                    <div className="aspect-[3/4] relative overflow-hidden bg-gradient-to-br from-amber-50 to-orange-50 dark:from-slate-800 dark:to-slate-900">
                      {product.image_urls?.[0] ? (
                        <img
                          src={product.image_urls[0]}
                          alt={product.name}
                          className="w-full h-full object-cover"
                        />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center">
                          <Package className="h-12 w-12 text-amber-200 dark:text-slate-700" />
                        </div>
                      )}
                      {discount > 0 && (
                        <div className="absolute top-2 left-2">
                          <Badge className="bg-red-500 text-white text-xs">-{discount}%</Badge>
                        </div>
                      )}
                    </div>

                    {/* Content */}
                    <div className="p-2.5 space-y-1.5">
                      <h3 className="font-semibold text-xs text-slate-800 dark:text-slate-100 line-clamp-2">
                        {product.name}
                      </h3>
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-amber-600 dark:text-amber-400 text-sm">
                          {formatPrice(product.price)}
                        </span>
                        {product.compare_at_price && (
                          <span className="text-xs text-slate-400 line-through">
                            {formatPrice(product.compare_at_price)}
                          </span>
                        )}
                      </div>
                    </div>
                  </motion.div>
                );
              })}
            </div>
          </motion.div>
        )}

        {/* Free Resources Section */}
        {!searchQuery && !selectedCategory && freeProducts.length > 0 && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4, delay: 0.5 }}
            className="mb-6"
          >
            <div className="flex items-center gap-2 mb-3">
              <Gift className="h-4 w-4 text-emerald-500" />
              <h2 className="text-sm font-semibold text-slate-900 dark:text-white">Free Resources</h2>
            </div>
            <div className="grid grid-cols-2 gap-3">
              {freeProducts.slice(0, 4).map((product: any, index: number) => (
                <motion.div
                  key={product.id}
                  initial={{ opacity: 0, scale: 0.9 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ duration: 0.3, delay: 0.6 + index * 0.05 }}
                  whileTap={{ scale: 0.97 }}
                  onClick={() => setSelectedProduct(product)}
                  className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 overflow-hidden cursor-pointer"
                >
                  {/* Cover Image */}
                  <div className="aspect-[3/4] relative overflow-hidden bg-gradient-to-br from-emerald-50 to-green-50 dark:from-slate-800 dark:to-slate-900">
                    {product.image_urls?.[0] ? (
                      <img
                        src={product.image_urls[0]}
                        alt={product.name}
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center">
                        <Package className="h-12 w-12 text-emerald-200 dark:text-slate-700" />
                      </div>
                    )}
                    <div className="absolute top-2 left-2">
                      <Badge className="bg-emerald-500 text-white text-xs">FREE</Badge>
                    </div>
                  </div>

                  {/* Content */}
                  <div className="p-2.5 space-y-1.5">
                    <h3 className="font-semibold text-xs text-slate-800 dark:text-slate-100 line-clamp-2">
                      {product.name}
                    </h3>
                    <span className="font-bold text-emerald-600 dark:text-emerald-400 text-sm">
                      Free
                    </span>
                  </div>
                </motion.div>
              ))}
            </div>
          </motion.div>
        )}

        {/* All Products Section */}
        <div>
          {(searchQuery || selectedCategory) && (
            <div className="flex items-center gap-2 mb-3">
              <Sparkles className="h-4 w-4 text-amber-500" />
              <h2 className="text-sm font-semibold text-slate-900 dark:text-white">
                {searchQuery ? "Search Results" : "All Resources"}
              </h2>
            </div>
          )}

          {isLoading ? (
            <div className="grid grid-cols-2 gap-3">
              {Array.from({ length: 6 }).map((_, i) => (
                <Skeleton key={i} className="aspect-[3/4] rounded-xl" />
              ))}
            </div>
          ) : filteredProducts.length === 0 ? (
            <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 p-10 text-center">
              <Package className="h-10 w-10 text-slate-300 dark:text-slate-600 mx-auto mb-3" />
              <p className="text-sm font-medium text-slate-600 dark:text-slate-400">
                No resources found
              </p>
              <p className="text-xs text-slate-400 dark:text-slate-500 mt-1">
                Try adjusting your search or filters
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-2 gap-3">
              {filteredProducts.map((product: any) => {
                const discount = calculateDiscount(product.price, product.compare_at_price);
                const isFree = product.pricing === "free" || product.price === 0;

                return (
                  <motion.div
                    key={product.id}
                    initial={{ opacity: 0, scale: 0.95 }}
                    animate={{ opacity: 1, scale: 1 }}
                    whileTap={{ scale: 0.97 }}
                    onClick={() => setSelectedProduct(product)}
                    className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 overflow-hidden cursor-pointer"
                  >
                    {/* Cover Image */}
                    <div className="aspect-[3/4] relative overflow-hidden bg-gradient-to-br from-amber-50 to-orange-50 dark:from-slate-800 dark:to-slate-900">
                      {product.image_urls?.[0] ? (
                        <img
                          src={product.image_urls[0]}
                          alt={product.name}
                          className="w-full h-full object-cover"
                        />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center">
                          <Package className="h-12 w-12 text-amber-200 dark:text-slate-700" />
                        </div>
                      )}

                      {/* Badges */}
                      {isFree && (
                        <div className="absolute top-2 left-2">
                          <Badge className="bg-emerald-500 text-white text-xs">FREE</Badge>
                        </div>
                      )}
                      {!isFree && discount > 0 && (
                        <div className="absolute top-2 left-2">
                          <Badge className="bg-red-500 text-white text-xs">-{discount}%</Badge>
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
                    <div className="p-2.5 space-y-1.5">
                      <h3 className="font-semibold text-xs text-slate-800 dark:text-slate-100 line-clamp-2">
                        {product.name}
                      </h3>
                      <div className="flex items-center gap-2">
                        <span className={cn(
                          "font-bold text-sm",
                          isFree ? "text-emerald-600 dark:text-emerald-400" : "text-amber-600 dark:text-amber-400"
                        )}>
                          {isFree ? "Free" : formatPrice(product.price)}
                        </span>
                        {!isFree && product.compare_at_price && (
                          <span className="text-xs text-slate-400 line-through">
                            {formatPrice(product.compare_at_price)}
                          </span>
                        )}
                      </div>
                    </div>
                  </motion.div>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {/* Product Detail Modal */}
      <AnimatePresence>
        {selectedProduct && (
          <Dialog open={!!selectedProduct} onOpenChange={() => setSelectedProduct(null)}>
            <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto p-0">
              <motion.div
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.95 }}
                className="space-y-4 p-5"
              >
                {/* Image */}
                <div className="aspect-[3/4] rounded-xl overflow-hidden bg-gradient-to-br from-amber-50 to-orange-50 dark:from-slate-800 dark:to-slate-900">
                  {selectedProduct.image_urls?.[0] ? (
                    <img
                      src={selectedProduct.image_urls[0]}
                      alt={selectedProduct.name}
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center">
                      <Package className="h-20 w-20 text-amber-200 dark:text-slate-700" />
                    </div>
                  )}
                </div>

                {/* Details */}
                <div className="space-y-3">
                  <div>
                    <h2 className="text-xl font-bold text-slate-900 dark:text-slate-100">
                      {selectedProduct.name}
                    </h2>
                    <div className="flex items-center gap-2 mt-2">
                      <span className={cn(
                        "text-2xl font-bold",
                        selectedProduct.pricing === "free" || selectedProduct.price === 0
                          ? "text-emerald-600 dark:text-emerald-400"
                          : "text-amber-600 dark:text-amber-400"
                      )}>
                        {selectedProduct.pricing === "free" || selectedProduct.price === 0
                          ? "Free"
                          : formatPrice(selectedProduct.price)}
                      </span>
                      {selectedProduct.compare_at_price && selectedProduct.compare_at_price > selectedProduct.price && (
                        <span className="text-sm text-slate-400 line-through">
                          {formatPrice(selectedProduct.compare_at_price)}
                        </span>
                      )}
                    </div>
                  </div>

                  {selectedProduct.short_description && (
                    <p className="text-sm text-slate-600 dark:text-slate-400">
                      {selectedProduct.short_description}
                    </p>
                  )}

                  {selectedProduct.description && (
                    <div className="prose prose-sm dark:prose-invert">
                      <p className="text-sm text-slate-700 dark:text-slate-300 whitespace-pre-wrap">
                        {selectedProduct.description}
                      </p>
                    </div>
                  )}

                  {/* Badges */}
                  <div className="flex flex-wrap gap-2">
                    <Badge className="bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300">
                      {selectedProduct.product_type}
                    </Badge>
                    {(selectedProduct.pricing === "free" || selectedProduct.price === 0) && (
                      <Badge className="bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-400">
                        Free
                      </Badge>
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
                  <div className="pt-3 border-t border-slate-200 dark:border-slate-700">
                    <p className="text-xs text-slate-600 dark:text-slate-400 mb-3">
                      Interested in this resource? Contact the church office to get it.
                    </p>
                    <Button
                      className="w-full bg-amber-500 hover:bg-amber-600 text-white h-11 rounded-full"
                      onClick={() => {
                        toast.success("Please contact the church office for this resource");
                        setSelectedProduct(null);
                      }}
                    >
                      <ShoppingBag className="h-4 w-4 mr-2" />
                      Request Resource
                    </Button>
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
