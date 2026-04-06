import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ShoppingCart, Package } from "lucide-react";
import { CurrencyDisplay } from "@/components/finance/CurrencyDisplay";

export interface Product {
  id: string;
  name: string;
  category: string;
  description?: string | null;
  image_urls: string[];
  product_type: "physical" | "digital";
  price: number;
  compare_at_price?: number | null;
  currency: string;
  stock_quantity: number;
  status: "active" | "draft" | "out_of_stock";
  sales_count?: number;
}

interface ProductCardProps {
  product: Product;
  onAddToCart: () => void;
}

function StockBadge({ qty, status }: { qty: number; status: string }) {
  if (status === "out_of_stock" || qty === 0)
    return <Badge className="bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400 text-xs">Out of Stock</Badge>;
  if (qty <= 5)
    return <Badge className="bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400 text-xs">Low Stock</Badge>;
  return <Badge className="bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400 text-xs">In Stock</Badge>;
}

export function ProductCard({ product, onAddToCart }: ProductCardProps) {
  const isOutOfStock = product.status === "out_of_stock" || product.stock_quantity === 0;
  const mainImage = product.image_urls?.[0];

  return (
    <div className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg shadow-sm overflow-hidden flex flex-col">
      {/* Image */}
      <div className="aspect-square bg-slate-100 dark:bg-slate-700 relative overflow-hidden">
        {mainImage ? (
          <img src={mainImage} alt={product.name} className="w-full h-full object-cover" />
        ) : (
          <div className="flex items-center justify-center h-full">
            <Package className="h-12 w-12 text-slate-400" />
          </div>
        )}
        <div className="absolute top-2 left-2">
          <Badge variant="secondary" className="text-xs capitalize">{product.category?.replace(/_/g, " ")}</Badge>
        </div>
      </div>

      <div className="p-3 flex flex-col gap-2 flex-1">
        <h3 className="font-semibold text-sm text-foreground line-clamp-2">{product.name}</h3>

        {product.description && (
          <p className="text-xs text-muted-foreground line-clamp-2">{product.description}</p>
        )}

        <div className="flex items-center gap-2 mt-auto">
          <span className="font-bold text-foreground">
            <CurrencyDisplay amount={product.price} currency={product.currency} />
          </span>
          {product.compare_at_price && product.compare_at_price > product.price && (
            <span className="text-xs text-muted-foreground line-through">
              <CurrencyDisplay amount={product.compare_at_price} currency={product.currency} />
            </span>
          )}
        </div>

        <StockBadge qty={product.stock_quantity} status={product.status} />

        <Button
          size="sm"
          className="w-full gap-1"
          disabled={isOutOfStock}
          onClick={onAddToCart}
        >
          <ShoppingCart className="h-3.5 w-3.5" />
          Add to Cart
        </Button>
      </div>
    </div>
  );
}
