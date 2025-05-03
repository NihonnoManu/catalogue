import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { queryClient } from "@/lib/queryClient";
import { apiRequest } from "@/lib/queryClient";
import { CatalogItem, insertCatalogItemSchema } from "@shared/schema";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useToast } from "@/hooks/use-toast";
import { Link } from "wouter";

// UI Components
import { Button } from "@/components/ui/button";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Separator } from "@/components/ui/separator";
import { Pencil, Trash, Plus, ArrowLeft } from "lucide-react";

type FormData = {
  name: string;
  description: string;
  price: number;
  slug: string;
};

export default function CatalogManager() {
  const [isEditing, setIsEditing] = useState(false);
  const [currentItemId, setCurrentItemId] = useState<number | null>(null);
  const { toast } = useToast();

  // Fetch catalog items
  const { data: catalogItems, isLoading } = useQuery<CatalogItem[]>({
    queryKey: ["/api/catalog"],
  });

  // Form setup
  const form = useForm<FormData>({
    resolver: zodResolver(insertCatalogItemSchema),
    defaultValues: {
      name: "",
      description: "",
      price: 0,
      slug: "",
    },
  });

  // Create mutation
  const createMutation = useMutation({
    mutationFn: async (data: FormData) => {
      const response = await apiRequest("POST", "/api/catalog", data);
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || "Failed to create item");
      }
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/catalog"] });
      form.reset();
      toast({
        title: "Success",
        description: "Item created successfully",
      });
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to create item",
        variant: "destructive",
      });
    },
  });

  // Update mutation
  const updateMutation = useMutation({
    mutationFn: async (data: FormData & { id: number }) => {
      const { id, ...itemData } = data;
      const response = await apiRequest("PUT", `/api/catalog/${id}`, itemData);
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || "Failed to update item");
      }
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/catalog"] });
      form.reset();
      setIsEditing(false);
      setCurrentItemId(null);
      toast({
        title: "Success",
        description: "Item updated successfully",
      });
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to update item",
        variant: "destructive",
      });
    },
  });

  // Delete mutation
  const deleteMutation = useMutation({
    mutationFn: async (id: number) => {
      const response = await apiRequest("DELETE", `/api/catalog/${id}`);
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || "Failed to delete item");
      }
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/catalog"] });
      toast({
        title: "Success",
        description: "Item deleted successfully",
      });
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to delete item",
        variant: "destructive",
      });
    },
  });

  // Form submission handler
  const onSubmit = (data: FormData) => {
    if (isEditing && currentItemId) {
      updateMutation.mutate({ ...data, id: currentItemId });
    } else {
      createMutation.mutate(data);
    }
  };

  // Edit item handler
  const handleEdit = (item: CatalogItem) => {
    setIsEditing(true);
    setCurrentItemId(item.id);
    form.reset({
      name: item.name,
      description: item.description,
      price: item.price,
      slug: item.slug,
    });
  };

  // Cancel edit handler
  const handleCancelEdit = () => {
    setIsEditing(false);
    setCurrentItemId(null);
    form.reset();
  };

  return (
    <div className="container py-md">
      <div className="flex justify-between items-center mb-md">
        <div>
          <h1 className="text-lg font-bold mb-sm">Catalog Manager</h1>
          <p className="text-muted">
            Add, edit, or remove items from the catalog.
          </p>
        </div>
        <Link href="/">
          <button className="btn btn-secondary">
            <ArrowLeft style={{ marginRight: '0.5rem', height: '1rem', width: '1rem' }} /> Back to Chat
          </button>
        </Link>
      </div>

      <div className="flex gap-md" style={{flexDirection: 'column'}}>
        {/* Item Form */}
        <div>
          <div className="card">
            <div className="card-header">
              <div className="card-title">{isEditing ? "Edit Item" : "Add New Item"}</div>
              <p className="card-description text-muted">
                {isEditing
                  ? "Edit the catalog item details"
                  : "Fill out the form to add a new item to the catalog"}
              </p>
            </div>
            <div className="p-md">
              <Form {...form}>
                <form
                  onSubmit={form.handleSubmit(onSubmit)}
                  className="space-y-4"
                >
                  <FormField
                    control={form.control}
                    name="name"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Name</FormLabel>
                        <FormControl>
                          <Input placeholder="Coffee Run" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="description"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Description</FormLabel>
                        <FormControl>
                          <Textarea
                            placeholder="Get coffee for the whole team"
                            {...field}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="price"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Price (minipoints)</FormLabel>
                        <FormControl>
                          <Input
                            type="number"
                            min="1"
                            {...field}
                            onChange={(e) => {
                              const value = e.target.value;
                              field.onChange(value === "" ? 0 : parseInt(value, 10));
                            }}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="slug"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Slug</FormLabel>
                        <FormControl>
                          <Input
                            placeholder="coffee-run"
                            {...field}
                            onChange={(e) => {
                              // Auto-format slug to be URL-friendly
                              const value = e.target.value
                                .toLowerCase()
                                .replace(/\s+/g, "-")
                                .replace(/[^a-z0-9-]/g, "");
                              field.onChange(value);
                            }}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <div className="flex justify-end space-x-2 pt-2">
                    {isEditing && (
                      <button
                        className="btn btn-secondary"
                        type="button"
                        onClick={handleCancelEdit}
                      >
                        Cancel
                      </button>
                    )}
                    <button
                      className="btn btn-primary"
                      type="submit"
                      disabled={
                        createMutation.isPending ||
                        updateMutation.isPending ||
                        !form.formState.isDirty
                      }
                    >
                      {isEditing ? "Update" : "Add"} Item
                    </button>
                  </div>
                </form>
              </Form>
            </div>
          </div>
        </div>

        {/* Item List */}
        <div>
          <div className="card">
            <div className="card-header">
              <div className="card-title">Catalog Items</div>
              <p className="card-description text-muted">
                Manage your existing catalog items here.
              </p>
            </div>
            <div className="p-md">
              {isLoading ? (
                <div className="flex items-center justify-center" style={{height: '10rem'}}>
                  <div className="flex gap-sm">
                    <div style={{width: '0.75rem', height: '0.75rem'}} className="rounded-full bg-muted"></div>
                    <div style={{width: '0.75rem', height: '0.75rem'}} className="rounded-full bg-muted"></div>
                    <div style={{width: '0.75rem', height: '0.75rem'}} className="rounded-full bg-muted"></div>
                  </div>
                </div>
              ) : catalogItems && Array.isArray(catalogItems) && catalogItems.length > 0 ? (
                <div className="table">
                  <table className="table">
                    <thead>
                      <tr>
                        <th>Name</th>
                        <th>Description</th>
                        <th>Price</th>
                        <th>Slug</th>
                        <th style={{textAlign: 'right'}}>Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {Array.isArray(catalogItems) && catalogItems.map((item: CatalogItem) => (
                        <tr key={item.id}>
                          <td className="font-bold">{item.name}</td>
                          <td>
                            {item.description.length > 30
                              ? `${item.description.substring(0, 30)}...`
                              : item.description}
                          </td>
                          <td>{item.price} pts</td>
                          <td>{item.slug}</td>
                          <td style={{textAlign: 'right'}}>
                            <button
                              className="btn btn-secondary"
                              onClick={() => handleEdit(item)}
                            >
                              <Pencil style={{height: '1rem', width: '1rem'}} />
                            </button>
                            <AlertDialog>
                              <AlertDialogTrigger asChild>
                                <button className="btn btn-secondary">
                                  <Trash style={{height: '1rem', width: '1rem'}} />
                                </button>
                              </AlertDialogTrigger>
                              <AlertDialogContent>
                                <AlertDialogHeader>
                                  <AlertDialogTitle>
                                    Are you sure you want to delete this item?
                                  </AlertDialogTitle>
                                  <AlertDialogDescription>
                                    This action cannot be undone if the item has no
                                    purchase history. Items that have been purchased
                                    cannot be deleted.
                                  </AlertDialogDescription>
                                </AlertDialogHeader>
                                <AlertDialogFooter>
                                  <AlertDialogCancel>Cancel</AlertDialogCancel>
                                  <AlertDialogAction
                                    onClick={() => deleteMutation.mutate(item.id)}
                                  >
                                    Delete
                                  </AlertDialogAction>
                                </AlertDialogFooter>
                              </AlertDialogContent>
                            </AlertDialog>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ) : (
                <div className="text-center py-md">
                  <p className="text-muted">
                    No catalog items found. Add your first item using the form.
                  </p>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
