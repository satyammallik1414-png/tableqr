"use client";

import { useState, useRef } from "react";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { motion } from "framer-motion";
import {
  Plus,
  Search,
  Filter,
  Image as ImageIcon,
  FolderPlus,
  Tag,
  Check,
  Sparkles,
  Upload,
  X,
  QrCode,
  ArrowLeft,
} from "lucide-react";
import { QRCodeManager } from "@/components/admin/QRCodeManager";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { formatCurrency } from "@/lib/utils";
import { useSession } from "next-auth/react";
import toast from "react-hot-toast";
import type { ApiResponse, MenuItem, Category } from "@/types";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { menuItemSchema } from "@/lib/validations";
import { z } from "zod";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { FeatureGuard } from "@/components/shared/FeatureGuard";

async function fetchMenuItems() {
  const res = await fetch("/api/menu");
  const data: ApiResponse<{ categories: Category[]; items: MenuItem[] }> =
    await res.json();
  if (!data.success) throw new Error(data.error);
  return data.data!;
}

type MenuFormValues = z.infer<typeof menuItemSchema>;

export default function MenuManagementPage() {
  const router = useRouter();
  const { data: session } = useSession();
  const queryClient = useQueryClient();
  const [search, setSearch] = useState("");
  const [selectedCategoryFilter, setSelectedCategoryFilter] = useState<string>("ALL");
  const [dietaryFilter, setDietaryFilter] = useState<"ALL" | "VEG" | "NON_VEG">("ALL");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [categoryDialogOpen, setCategoryDialogOpen] = useState(false);
  const [newGlobalCategoryName, setNewGlobalCategoryName] = useState("");
  const [isCreatingGlobalCategory, setIsCreatingGlobalCategory] = useState(false);
  const [editingItem, setEditingItem] = useState<MenuItem | null>(null);
  const [menuQrOpen, setMenuQrOpen] = useState(false);

  const { data, isLoading } = useQuery({
    queryKey: ["menu-items"],
    queryFn: fetchMenuItems,
  });

  const createMutation = useMutation({
    mutationFn: async (formData: Record<string, unknown>) => {
      const isEditing = !!editingItem;
      const url = isEditing
        ? `/api/menu/items/${editingItem.id}`
        : "/api/menu/items";
      const method = isEditing ? "PUT" : "POST";

      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(formData),
      });

      const contentType = res.headers.get("content-type");
      if (!contentType || !contentType.includes("application/json")) {
        const text = await res.text();
        throw new Error(text || `Server returned ${res.status}`);
      }

      const result: ApiResponse = await res.json();
      if (!result.success) throw new Error(result.error || "Failed to save menu item");
      return result.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["menu-items"] });
      setDialogOpen(false);
      setEditingItem(null);
      toast.success(editingItem ? "Item updated successfully" : "Item created successfully");
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const toggleAvailable = useMutation({
    mutationFn: async ({ id, isAvailable }: { id: string; isAvailable: boolean }) => {
      const res = await fetch(`/api/menu/items/${id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ isAvailable }),
      });
      const result: ApiResponse = await res.json();
      if (!result.success) throw new Error(result.error);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["menu-items"] });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const res = await fetch(`/api/menu/items/${id}`, { method: "DELETE" });
      const result: ApiResponse = await res.json();
      if (!result.success) throw new Error(result.error);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["menu-items"] });
      toast.success("Item deleted");
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const handleCreateNewCategory = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newGlobalCategoryName.trim()) {
      toast.error("Please enter a category name");
      return;
    }
    try {
      setIsCreatingGlobalCategory(true);
      const res = await fetch("/api/menu/categories", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: newGlobalCategoryName.trim() }),
      });
      const json = await res.json();
      if (json.success) {
        toast.success(`Category "${json.data.name}" added successfully`);
        queryClient.invalidateQueries({ queryKey: ["menu-items"] });
        setNewGlobalCategoryName("");
        setCategoryDialogOpen(false);
      } else {
        toast.error(json.error || "Failed to create category");
      }
    } catch {
      toast.error("Network error creating category");
    } finally {
      setIsCreatingGlobalCategory(false);
    }
  };

  const categories = data?.categories ?? [];
  const items = data?.items ?? [];

  const filtered = items.filter((i) => {
    const matchesSearch =
      i.name.toLowerCase().includes(search.toLowerCase()) ||
      i.description?.toLowerCase().includes(search.toLowerCase());
    const matchesCategory =
      selectedCategoryFilter === "ALL" || i.categoryId === selectedCategoryFilter;
    const matchesDietary =
      dietaryFilter === "ALL"
        ? true
        : dietaryFilter === "VEG"
        ? i.isVeg
        : !i.isVeg;
    return matchesSearch && matchesCategory && matchesDietary;
  });

  return (
    <FeatureGuard featureKey="MENU">
      <div className="space-y-6">
        {/* Header with Title and Action Buttons */}
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-3">
            <Button
              variant="outline"
              size="icon"
              onClick={() => router.back()}
              className="h-10 w-10 rounded-xl border-gray-200 text-gray-700 hover:bg-gray-100 hover:text-gray-900 shrink-0 cursor-pointer shadow-xs"
              title="Go Back"
              aria-label="Go Back"
            >
              <ArrowLeft className="h-5 w-5" />
            </Button>
            <div>
              <h1 className="font-heading text-2xl font-bold">Menu Management</h1>
              <p className="text-sm text-gray-500">
                Manage food & beverage catalog, categories, and availability
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2.5">
            <Button
              variant="outline"
              onClick={() => setMenuQrOpen(true)}
              className="border-slate-300 text-navy-900 hover:bg-slate-50 gap-2 font-semibold text-xs"
            >
              <QrCode className="h-4 w-4 text-navy-900" />
              Restaurant Menu QR
            </Button>

            {/* Add Category Dialog */}
            <Dialog open={categoryDialogOpen} onOpenChange={setCategoryDialogOpen}>
              <DialogTrigger asChild>
                <Button variant="outline" className="border-gray-200 dark:border-gray-800">
                  <FolderPlus className="mr-2 h-4 w-4 text-primary-500" />
                  Add Category
                </Button>
              </DialogTrigger>
              <DialogContent className="max-w-md">
                <DialogHeader>
                  <DialogTitle className="flex items-center gap-2">
                    <FolderPlus className="h-5 w-5 text-primary-500" />
                    Create New Category
                  </DialogTitle>
                </DialogHeader>
                <form onSubmit={handleCreateNewCategory} className="space-y-4 pt-2">
                  <div className="space-y-2">
                    <Label htmlFor="catName">Category Name</Label>
                    <Input
                      id="catName"
                      placeholder="e.g. Starters, Cold Brews, Pizzas..."
                      value={newGlobalCategoryName}
                      onChange={(e) => setNewGlobalCategoryName(e.target.value)}
                      autoFocus
                    />
                    <p className="text-xs text-gray-500">
                      Dishes will be grouped and displayed under this category in both the admin portal and customer QR menu.
                    </p>
                  </div>
                  <div className="flex justify-end gap-2 pt-2">
                    <Button
                      type="button"
                      variant="ghost"
                      onClick={() => setCategoryDialogOpen(false)}
                    >
                      Cancel
                    </Button>
                    <Button type="submit" disabled={isCreatingGlobalCategory || !newGlobalCategoryName.trim()}>
                      {isCreatingGlobalCategory ? "Creating..." : "Create Category"}
                    </Button>
                  </div>
                </form>
              </DialogContent>
            </Dialog>

            {/* Add / Edit Item Dialog */}
            <Dialog
              open={dialogOpen}
              onOpenChange={(open) => {
                setDialogOpen(open);
                if (!open) setEditingItem(null);
              }}
            >
              <DialogTrigger asChild>
                <Button onClick={() => setEditingItem(null)}>
                  <Plus className="mr-2 h-4 w-4" /> Add Item
                </Button>
              </DialogTrigger>
              <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
                <DialogHeader>
                  <DialogTitle>
                    {editingItem ? "Edit Menu Item" : "Add New Menu Item"}
                  </DialogTitle>
                </DialogHeader>
                <MenuForm
                  key={editingItem ? editingItem.id : `new-item-${categories[0]?.id || "empty"}-${dialogOpen}`}
                  categories={categories}
                  defaultValues={editingItem ?? undefined}
                  onSubmit={(values) =>
                    createMutation.mutate(values as Record<string, unknown>)
                  }
                  loading={createMutation.isPending}
                  onCategoryCreated={() => {
                    queryClient.invalidateQueries({ queryKey: ["menu-items"] });
                  }}
                />
              </DialogContent>
            </Dialog>
          </div>
        </div>

        {/* Search & Filter */}
        <div className="flex flex-col sm:flex-row gap-3">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
            <Input
              placeholder="Search menu items by name or description..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-9"
            />
          </div>
          {/* Dietary Filter Pills */}
          <div className="flex items-center gap-1 p-1 bg-gray-100 dark:bg-gray-800/80 border border-gray-200/80 dark:border-gray-700/60 rounded-xl shrink-0">
            <button
              onClick={() => setDietaryFilter("ALL")}
              className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition-all cursor-pointer ${
                dietaryFilter === "ALL"
                  ? "bg-white text-gray-900 shadow-xs dark:bg-gray-700 dark:text-white"
                  : "text-gray-500 hover:text-gray-900 dark:text-gray-400"
              }`}
            >
              All Types
            </button>
            <button
              onClick={() => setDietaryFilter("VEG")}
              className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-lg transition-all cursor-pointer ${
                dietaryFilter === "VEG"
                  ? "bg-emerald-600 text-white shadow-xs"
                  : "text-gray-600 hover:text-emerald-700 dark:text-gray-300"
              }`}
            >
              <div className="flex h-3 w-3 shrink-0 items-center justify-center rounded-xs border border-emerald-400 bg-white p-0.5">
                <div className="h-1.5 w-1.5 rounded-full bg-emerald-600" />
              </div>
              Veg
            </button>
            <button
              onClick={() => setDietaryFilter("NON_VEG")}
              className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-lg transition-all cursor-pointer ${
                dietaryFilter === "NON_VEG"
                  ? "bg-rose-600 text-white shadow-xs"
                  : "text-gray-600 hover:text-rose-700 dark:text-gray-300"
              }`}
            >
              <div className="flex h-3 w-3 shrink-0 items-center justify-center rounded-xs border border-rose-400 bg-white p-0.5">
                <div className="h-1.5 w-1.5 rounded-full bg-rose-600" />
              </div>
              Non-Veg
            </button>
          </div>
        </div>

        {/* Category Pills Filter */}
        {categories.length > 0 && (
          <div className="flex gap-2 overflow-x-auto pb-1">
            <button
              onClick={() => setSelectedCategoryFilter("ALL")}
              className={`shrink-0 rounded-xl px-3.5 py-1.5 text-xs font-semibold transition-all ${
                selectedCategoryFilter === "ALL"
                  ? "bg-gray-900 text-white shadow-sm dark:bg-gray-100 dark:text-gray-900"
                  : "bg-gray-100 text-gray-600 hover:bg-gray-200 dark:bg-gray-800 dark:text-gray-400"
              }`}
            >
              All Items ({items.length})
            </button>
            {categories.map((cat) => {
              const count = items.filter((it) => it.categoryId === cat.id).length;
              const isSelected = selectedCategoryFilter === cat.id;
              return (
                <button
                  key={cat.id}
                  onClick={() => setSelectedCategoryFilter(cat.id)}
                  className={`shrink-0 flex items-center gap-1.5 rounded-xl px-3.5 py-1.5 text-xs font-semibold transition-all ${
                    isSelected
                      ? "bg-primary-600 text-white shadow-sm dark:bg-primary-500"
                      : "bg-gray-100 text-gray-600 hover:bg-gray-200 dark:bg-gray-800 dark:text-gray-400"
                  }`}
                >
                  <Tag className="h-3 w-3 opacity-70" />
                  {cat.name} ({count})
                </button>
              );
            })}
          </div>
        )}

        {/* Menu Grid */}
        {isLoading ? (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            {[1, 2, 3, 4, 5, 6].map((i) => (
              <Skeleton key={i} className="h-72 rounded-2xl" />
            ))}
          </div>
        ) : (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            {filtered.map((item) => (
              <motion.div
                key={item.id}
                layout
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
              >
                <Card className="overflow-hidden rounded-2xl border border-gray-200/80 shadow-sm transition-all hover:shadow-md dark:border-gray-800">
                  <div className="relative aspect-video bg-gray-100 dark:bg-gray-800">
                    {item.image ? (
                      <Image
                        src={item.image}
                        alt={item.name}
                        fill
                        sizes="(max-width: 768px) 50vw, 33vw"
                        className="object-cover"
                      />
                    ) : (
                      <div className="flex h-full items-center justify-center">
                        <ImageIcon className="h-8 w-8 text-gray-400" />
                      </div>
                    )}
                    <div className="absolute left-2 top-2">
                      <div
                        className={`flex items-center gap-1.5 px-2 py-0.5 rounded-md border text-[10px] font-bold shadow-xs backdrop-blur-xs ${
                          item.isVeg
                            ? "border-emerald-500/80 bg-white/95 text-emerald-800 dark:bg-gray-900/90 dark:text-emerald-300 dark:border-emerald-600"
                            : "border-rose-500/80 bg-white/95 text-rose-800 dark:bg-gray-900/90 dark:text-rose-300 dark:border-rose-600"
                        }`}
                      >
                        <div
                          className={`flex h-3 w-3 shrink-0 items-center justify-center rounded-xs border ${
                            item.isVeg ? "border-emerald-600" : "border-rose-600"
                          } p-0.5`}
                        >
                          <div
                            className={`h-1.5 w-1.5 rounded-full ${
                              item.isVeg ? "bg-emerald-600" : "bg-rose-600"
                            }`}
                          />
                        </div>
                        <span>{item.isVeg ? "Veg" : "Non-Veg"}</span>
                      </div>
                    </div>
                    <div className="absolute right-2 top-2 flex gap-1">
                      {item.isFeatured && (
                        <Badge variant="default" className="text-[10px]">
                          Featured
                        </Badge>
                      )}
                      {item.isTrending && (
                        <Badge variant="secondary" className="text-[10px]">
                          Trending
                        </Badge>
                      )}
                    </div>
                  </div>
                  <CardContent className="p-4">
                    <div className="flex items-start justify-between">
                      <div>
                        <h3 className="font-heading font-semibold text-gray-900 dark:text-gray-100">
                          {item.name}
                        </h3>
                        <p className="line-clamp-2 text-xs text-gray-500 mt-0.5">
                          {item.description || "No description provided"}
                        </p>
                      </div>
                      <Switch
                        checked={item.isAvailable}
                        onCheckedChange={(checked) =>
                          toggleAvailable.mutate({
                            id: item.id,
                            isAvailable: checked,
                          })
                        }
                      />
                    </div>
                    <div className="mt-3 flex items-center justify-between">
                      <span className="font-heading text-lg font-bold text-gray-900 dark:text-gray-100">
                        {formatCurrency(item.price)}
                      </span>
                      <div className="flex gap-1">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => {
                            setEditingItem(item);
                            setDialogOpen(true);
                          }}
                        >
                          Edit
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          className="text-danger-500 hover:text-danger-600 hover:bg-danger-50 dark:hover:bg-danger-950/30"
                          onClick={() => {
                            if (confirm("Delete this item?"))
                              deleteMutation.mutate(item.id);
                          }}
                        >
                          Delete
                        </Button>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </motion.div>
            ))}
            {filtered.length === 0 && (
              <div className="col-span-full py-16 text-center">
                <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl bg-gray-100 dark:bg-gray-800">
                  <Sparkles className="h-6 w-6 text-gray-400" />
                </div>
                <p className="mt-3 font-medium text-gray-900 dark:text-gray-100">No menu items found</p>
                <p className="mt-1 text-sm text-gray-500">
                  {search
                    ? "Try adjusting your search criteria"
                    : "Get started by adding your first dish to the menu"}
                </p>
              </div>
            )}
          </div>
        )}

        {menuQrOpen && (
          <QRCodeManager
            open={menuQrOpen}
            onOpenChange={setMenuQrOpen}
            type="RESTAURANT_MENU"
            branchId={session?.user?.branchId || categories[0]?.branchId || ""}
          />
        )}
      </div>
    </FeatureGuard>
  );
}

function MenuForm({
  categories,
  defaultValues,
  onSubmit,
  loading,
  onCategoryCreated,
}: {
  categories: Category[];
  defaultValues?: MenuItem;
  onSubmit: (values: Record<string, unknown>) => void;
  loading: boolean;
  onCategoryCreated?: () => void;
}) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [showQuickAdd, setShowQuickAdd] = useState(false);
  const [quickCategoryName, setQuickCategoryName] = useState("");
  const [isSubmittingQuickCategory, setIsSubmittingQuickCategory] = useState(false);
  const [itemImage, setItemImage] = useState<string>(defaultValues?.image || "");
  const [imageUrlInput, setImageUrlInput] = useState<string>(defaultValues?.image || "");

  const {
    register,
    handleSubmit,
    formState: { errors },
    setValue,
    watch,
  } = useForm<any>({
    resolver: zodResolver(menuItemSchema) as any,
    defaultValues: defaultValues
      ? {
          name: defaultValues.name,
          categoryId: defaultValues.categoryId,
          price: defaultValues.price,
          description: defaultValues.description || "",
          image: defaultValues.image || "",
          preparationTime: defaultValues.preparationTime || 10,
          isVeg: defaultValues.isVeg,
          isAvailable: defaultValues.isAvailable,
          isFeatured: defaultValues.isFeatured,
          isTrending: defaultValues.isTrending,
          isRecommended: defaultValues.isRecommended,
          variants: defaultValues.variants || [],
          addons: defaultValues.addons || [],
        }
      : {
          categoryId: categories[0]?.id || "",
          image: "",
          isVeg: true,
          isAvailable: true,
          isFeatured: false,
          isTrending: false,
          isRecommended: false,
          preparationTime: 10,
        },
  });

  const selectedCategoryId = watch("categoryId");
  const isVeg = watch("isVeg");

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 5 * 1024 * 1024) {
      toast.error("Image must be smaller than 5MB");
      return;
    }

    const reader = new FileReader();
    reader.onload = () => {
      const base64 = reader.result as string;
      setItemImage(base64);
      setImageUrlInput("");
      setValue("image", base64);
      toast.success("Photo attached successfully!");
    };
    reader.readAsDataURL(file);
  };

  const handleQuickAddCategory = async () => {
    if (!quickCategoryName.trim()) {
      toast.error("Enter category name");
      return;
    }
    try {
      setIsSubmittingQuickCategory(true);
      const res = await fetch("/api/menu/categories", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: quickCategoryName.trim() }),
      });
      const json = await res.json();
      if (json.success && json.data) {
        toast.success(`Category "${json.data.name}" created!`);
        setValue("categoryId", json.data.id, { shouldValidate: true });
        setQuickCategoryName("");
        setShowQuickAdd(false);
        onCategoryCreated?.();
      } else {
        toast.error(json.error || "Failed to create category");
      }
    } catch {
      toast.error("Network error creating category");
    } finally {
      setIsSubmittingQuickCategory(false);
    }
  };

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
      {/* Name */}
      <div className="space-y-2">
        <Label className="text-sm font-semibold text-gray-800 dark:text-gray-200">
          Name <span className="text-danger-500">*</span>
        </Label>
        <Input {...register("name")} placeholder="e.g. Butter Chicken, Paneer Tikka..." />
        {errors.name?.message && (
          <p className="text-xs text-danger-500">{String(errors.name.message)}</p>
        )}
      </div>

      {/* Description */}
      <div className="space-y-2">
        <Label className="text-sm font-semibold text-gray-800 dark:text-gray-200">
          Description
        </Label>
        <Textarea
          {...register("description")}
          placeholder="Brief description of flavors, ingredients, and portion size..."
          rows={2}
        />
      </div>

      {/* Category Selection with Clear Options & Inline Quick Add */}
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <Label className="text-sm font-semibold text-gray-800 dark:text-gray-200">
            Category <span className="text-danger-500">*</span>
          </Label>
          <button
            type="button"
            onClick={() => setShowQuickAdd(!showQuickAdd)}
            className="flex items-center gap-1 text-xs font-semibold text-primary-600 hover:text-primary-700 transition-colors dark:text-primary-400"
          >
            <Plus className="h-3.5 w-3.5" />
            {showQuickAdd ? "Choose from list" : "New category"}
          </button>
        </div>

        {showQuickAdd ? (
          <div className="flex gap-2">
            <Input
              value={quickCategoryName}
              onChange={(e) => setQuickCategoryName(e.target.value)}
              placeholder="e.g. Starters, Mocktails, Pastas..."
              className="flex-1"
              autoFocus
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  e.preventDefault();
                  handleQuickAddCategory();
                }
              }}
            />
            <Button
              type="button"
              onClick={handleQuickAddCategory}
              disabled={isSubmittingQuickCategory || !quickCategoryName.trim()}
              size="sm"
            >
              {isSubmittingQuickCategory ? "Saving..." : "Add"}
            </Button>
          </div>
        ) : (
          <Select
            value={selectedCategoryId || defaultValues?.categoryId || ""}
            onValueChange={(val) => setValue("categoryId", val, { shouldValidate: true })}
          >
            <SelectTrigger className="w-full text-sm font-medium">
              <SelectValue placeholder="Select a category" />
            </SelectTrigger>
            <SelectContent className="max-h-60 z-[100]">
              {categories.length === 0 ? (
                <div className="p-3 text-center text-xs text-gray-500">
                  No categories found. Click &quot;New category&quot; above to create one.
                </div>
              ) : (
                categories.map((cat) => (
                  <SelectItem key={cat.id} value={cat.id} className="cursor-pointer py-2">
                    <div className="flex items-center gap-2">
                      <Tag className="h-3.5 w-3.5 text-primary-500 opacity-80" />
                      <span className="font-medium text-gray-900 dark:text-gray-100">
                        {cat.name}
                      </span>
                    </div>
                  </SelectItem>
                ))
              )}
            </SelectContent>
          </Select>
        )}
        {errors.categoryId?.message && (
          <p className="text-xs text-danger-500">{String(errors.categoryId.message)}</p>
        )}
      </div>

      {/* Item Photo (Optional) */}
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <Label className="text-sm font-semibold text-gray-800 dark:text-gray-200">
            Item Photo <span className="text-xs font-normal text-gray-500">(Optional)</span>
          </Label>
          {itemImage && (
            <button
              type="button"
              onClick={() => {
                setItemImage("");
                setImageUrlInput("");
                setValue("image", "");
              }}
              className="text-xs text-danger-500 hover:text-danger-600 transition-colors flex items-center gap-1"
            >
              <X className="h-3 w-3" /> Remove photo
            </button>
          )}
        </div>

        {itemImage ? (
          <div className="relative aspect-video w-full rounded-2xl overflow-hidden border border-gray-200 dark:border-gray-800 bg-gray-50 dark:bg-gray-900 group">
            <img
              src={itemImage}
              alt="Item preview"
              className="h-full w-full object-cover"
            />
            <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2">
              <Button
                type="button"
                variant="secondary"
                size="sm"
                className="bg-white/90 text-gray-900 hover:bg-white"
                onClick={() => fileInputRef.current?.click()}
              >
                Change Photo
              </Button>
            </div>
          </div>
        ) : (
          <div className="space-y-2">
            <div
              onClick={() => fileInputRef.current?.click()}
              className="flex flex-col items-center justify-center gap-2 p-3.5 rounded-2xl border-2 border-dashed border-gray-200 dark:border-gray-800 hover:border-primary-500/50 bg-gray-50/50 dark:bg-gray-900/50 cursor-pointer transition-all hover:bg-gray-50 dark:hover:bg-gray-900"
            >
              <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-primary-50 dark:bg-primary-950/40 text-primary-600">
                <Upload className="h-4 w-4" />
              </div>
              <div className="text-center">
                <p className="text-xs font-semibold text-gray-700 dark:text-gray-300">
                  Upload an image or photo from your device
                </p>
                <p className="text-[11px] text-gray-400 mt-0.5">
                  Click to select PNG, JPG, or WEBP
                </p>
              </div>
            </div>

            <div className="relative">
              <Input
                placeholder="Or paste an image URL (https://...)"
                value={imageUrlInput}
                onChange={(e) => {
                  setImageUrlInput(e.target.value);
                  setItemImage(e.target.value);
                  setValue("image", e.target.value);
                }}
                className="text-xs pr-8"
              />
              <ImageIcon className="absolute right-2.5 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400 pointer-events-none" />
            </div>

            {/* Food Presets */}
            <div className="flex items-center gap-1.5 flex-wrap pt-0.5">
              <span className="text-[11px] text-gray-400">Quick sample photos:</span>
              {[
                { label: "Burger", url: "https://images.unsplash.com/photo-1568901346375-23c9450c58cd?w=500&auto=format&fit=crop&q=80" },
                { label: "Pizza", url: "https://images.unsplash.com/photo-1513104890138-7c749659a591?w=500&auto=format&fit=crop&q=80" },
                { label: "Curry / Bowl", url: "https://images.unsplash.com/photo-1589302168068-964664d93dc0?w=500&auto=format&fit=crop&q=80" },
                { label: "Beverage", url: "https://images.unsplash.com/photo-1517256064527-09c73fc73e38?w=500&auto=format&fit=crop&q=80" },
                { label: "Dessert", url: "https://images.unsplash.com/photo-1551024709-8f23befc6f87?w=500&auto=format&fit=crop&q=80" },
              ].map((preset) => (
                <button
                  key={preset.label}
                  type="button"
                  onClick={() => {
                    setItemImage(preset.url);
                    setImageUrlInput(preset.url);
                    setValue("image", preset.url);
                  }}
                  className="rounded-lg bg-gray-100 hover:bg-gray-200 px-2 py-0.5 text-[10px] font-medium text-gray-600 transition-colors dark:bg-gray-800 dark:text-gray-300"
                >
                  {preset.label}
                </button>
              ))}
            </div>
          </div>
        )}

        <input
          type="file"
          ref={fileInputRef}
          accept="image/*"
          className="hidden"
          onChange={handleFileUpload}
        />
      </div>

      {/* Price & Prep Time */}
      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label className="text-sm font-semibold text-gray-800 dark:text-gray-200">
            Price (₹) <span className="text-danger-500">*</span>
          </Label>
          <Input
            type="number"
            step="0.01"
            placeholder="0.00"
            {...register("price", { valueAsNumber: true })}
          />
          {errors.price?.message && (
            <p className="text-xs text-danger-500">{String(errors.price.message)}</p>
          )}
        </div>
        <div className="space-y-2">
          <Label className="text-sm font-semibold text-gray-800 dark:text-gray-200">
            Prep Time (min)
          </Label>
          <Input
            type="number"
            placeholder="15"
            {...register("preparationTime", { valueAsNumber: true })}
          />
        </div>
      </div>

      {/* Food Type (Vegetarian / Non-Veg) */}
      <div className="space-y-1.5 pt-1">
        <Label className="text-xs font-bold uppercase tracking-wider text-gray-700 dark:text-gray-300">
          Food Type (Dietary)
        </Label>
        <div className="grid grid-cols-2 gap-3">
          <button
            type="button"
            onClick={() => setValue("isVeg", true, { shouldDirty: true, shouldTouch: true })}
            className={`flex items-center gap-2.5 rounded-xl border p-2.5 text-sm font-semibold transition-all cursor-pointer ${
              isVeg
                ? "border-emerald-500 bg-emerald-50 text-emerald-950 ring-2 ring-emerald-500/30 shadow-xs dark:bg-emerald-950/50 dark:text-emerald-200 dark:border-emerald-500"
                : "border-gray-200 bg-white text-gray-600 hover:border-gray-300 hover:bg-gray-50 dark:border-gray-800 dark:bg-gray-900 dark:text-gray-400"
            }`}
          >
            <div className="flex h-4 w-4 shrink-0 items-center justify-center rounded-xs border-2 border-emerald-600 p-0.5">
              <div className="h-2 w-2 rounded-full bg-emerald-600" />
            </div>
            <div className="text-left">
              <div className="font-bold text-xs sm:text-sm leading-tight">Vegetarian</div>
              <div className="text-[10px] text-gray-500 dark:text-gray-400 font-normal">Pure Veg Dish</div>
            </div>
          </button>

          <button
            type="button"
            onClick={() => setValue("isVeg", false, { shouldDirty: true, shouldTouch: true })}
            className={`flex items-center gap-2.5 rounded-xl border p-2.5 text-sm font-semibold transition-all cursor-pointer ${
              !isVeg
                ? "border-rose-500 bg-rose-50 text-rose-950 ring-2 ring-rose-500/30 shadow-xs dark:bg-rose-950/50 dark:text-rose-200 dark:border-rose-500"
                : "border-gray-200 bg-white text-gray-600 hover:border-gray-300 hover:bg-gray-50 dark:border-gray-800 dark:bg-gray-900 dark:text-gray-400"
            }`}
          >
            <div className="flex h-4 w-4 shrink-0 items-center justify-center rounded-xs border-2 border-rose-600 p-0.5">
              <div className="h-2 w-2 rounded-full bg-rose-600" />
            </div>
            <div className="text-left">
              <div className="font-bold text-xs sm:text-sm leading-tight">Non-Veg</div>
              <div className="text-[10px] text-gray-500 dark:text-gray-400 font-normal">Meat / Chicken / Fish</div>
            </div>
          </button>
        </div>
        <input type="hidden" {...register("isVeg")} />
      </div>

      {/* Badges & Highlights */}
      <div className="space-y-1.5 pt-1">
        <Label className="text-xs font-bold uppercase tracking-wider text-gray-700 dark:text-gray-300">
          Badges & Promotion
        </Label>
        <div className="grid grid-cols-3 gap-2">
          <Label className="flex cursor-pointer items-center gap-2 rounded-xl border border-gray-200 p-2.5 hover:bg-gray-50 transition-colors dark:border-gray-800 dark:hover:bg-gray-800/50">
            <input type="checkbox" {...register("isFeatured")} className="rounded text-primary-600 focus:ring-primary-500 h-4 w-4" />
            <span className="text-xs font-medium text-gray-800 dark:text-gray-200">Featured</span>
          </Label>
          <Label className="flex cursor-pointer items-center gap-2 rounded-xl border border-gray-200 p-2.5 hover:bg-gray-50 transition-colors dark:border-gray-800 dark:hover:bg-gray-800/50">
            <input type="checkbox" {...register("isTrending")} className="rounded text-primary-600 focus:ring-primary-500 h-4 w-4" />
            <span className="text-xs font-medium text-gray-800 dark:text-gray-200">Trending 🔥</span>
          </Label>
          <Label className="flex cursor-pointer items-center gap-2 rounded-xl border border-gray-200 p-2.5 hover:bg-gray-50 transition-colors dark:border-gray-800 dark:hover:bg-gray-800/50">
            <input type="checkbox" {...register("isRecommended")} className="rounded text-primary-600 focus:ring-primary-500 h-4 w-4" />
            <span className="text-xs font-medium text-gray-800 dark:text-gray-200">Recommended ⭐</span>
          </Label>
        </div>
      </div>

      <Button type="submit" className="w-full mt-2" disabled={loading}>
        {loading ? "Saving..." : defaultValues ? "Update Item" : "Create Item"}
      </Button>
    </form>
  );
}
