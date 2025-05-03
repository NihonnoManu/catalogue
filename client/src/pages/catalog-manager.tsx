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

  // Fetch catalog items and sort by price (low to high)
  const { data: catalogItemsRaw, isLoading } = useQuery<CatalogItem[]>({
    queryKey: ["/api/catalog"],
  });
  
  // Sort catalog items by price
  const catalogItems = catalogItemsRaw 
    ? [...catalogItemsRaw].sort((a, b) => a.price - b.price) 
    : [];

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
    <div className="container-fluid py-4" style={{ backgroundColor: 'var(--discord-dark)', minHeight: '100vh' }}>
      <div className="d-flex justify-content-between align-items-center mb-4">
        <div>
          <h1 className="fs-4 fw-bold mb-2">Catalog Manager</h1>
          <p className="text-discord-muted">
            Add, edit, or remove items from the catalog.
          </p>
        </div>
        <Link href="/">
          <button className="btn btn-discord-secondary">
            <ArrowLeft style={{ marginRight: '0.5rem', height: '1rem', width: '1rem' }} /> Back to Chat
          </button>
        </Link>
      </div>

      <div className="row gy-4">
        {/* Item Form */}
        <div className="col-12 col-md-4">
          <div className="card h-100" style={{ backgroundColor: 'var(--discord-main)', borderColor: 'var(--discord-border)', borderRadius: '8px' }}>
            <div className="card-header" style={{ backgroundColor: 'var(--discord-main)', borderColor: 'var(--discord-border)' }}>
              <h5 className="card-title mb-0 text-white">{isEditing ? "Edit Item" : "Add New Item"}</h5>
              <p className="card-text text-discord-muted small mt-1 mb-0">
                {isEditing
                  ? "Edit the catalog item details"
                  : "Fill out the form to add a new item to the catalog"}
              </p>
            </div>
            <div className="card-body">
              <Form {...form}>
                <form
                  onSubmit={form.handleSubmit(onSubmit)}
                >
                  <div className="mb-3">
                    <FormField
                      control={form.control}
                      name="name"
                      render={({ field }) => (
                        <div className="form-group">
                          <label className="form-label text-discord-text">Name</label>
                          <input type="text" className="form-control" style={{ backgroundColor: 'var(--discord-input)', color: 'var(--discord-text)', borderColor: 'var(--discord-border)' }} placeholder="Coffee Run" {...field} />
                          <FormMessage />
                        </div>
                      )}
                    />
                  </div>

                  <div className="mb-3">
                    <FormField
                      control={form.control}
                      name="description"
                      render={({ field }) => (
                        <div className="form-group">
                          <label className="form-label text-discord-text">Description</label>
                          <textarea 
                            className="form-control" 
                            style={{ backgroundColor: 'var(--discord-input)', color: 'var(--discord-text)', borderColor: 'var(--discord-border)' }}
                            placeholder="Get coffee for the whole team" 
                            rows={3}
                            {...field}
                          />
                          <FormMessage />
                        </div>
                      )}
                    />
                  </div>

                  <div className="mb-3">
                    <FormField
                      control={form.control}
                      name="price"
                      render={({ field }) => (
                        <div className="form-group">
                          <label className="form-label text-discord-text">Price (minipoints)</label>
                          <input 
                            type="number" 
                            className="form-control"
                            style={{ backgroundColor: 'var(--discord-input)', color: 'var(--discord-text)', borderColor: 'var(--discord-border)' }}  
                            min="1"
                            {...field}
                            onChange={(e) => {
                              const value = e.target.value;
                              field.onChange(value === "" ? 0 : parseInt(value, 10));
                            }}
                          />
                          <FormMessage />
                        </div>
                      )}
                    />
                  </div>

                  <div className="mb-3">
                    <FormField
                      control={form.control}
                      name="slug"
                      render={({ field }) => (
                        <div className="form-group">
                          <label className="form-label text-discord-text">Slug</label>
                          <input 
                            type="text" 
                            className="form-control"
                            style={{ backgroundColor: 'var(--discord-input)', color: 'var(--discord-text)', borderColor: 'var(--discord-border)' }}  
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
                          <FormMessage />
                        </div>
                      )}
                    />
                  </div>

                  <div className="d-flex justify-content-end gap-2 mt-4">
                    {isEditing && (
                      <button
                        className="btn btn-discord-secondary"
                        type="button"
                        onClick={handleCancelEdit}
                      >
                        Cancel
                      </button>
                    )}
                    <button
                      className="btn btn-discord-primary"
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
        <div className="col-12 col-md-8">
          <div className="card h-100" style={{ backgroundColor: 'var(--discord-main)', borderColor: 'var(--discord-border)', borderRadius: '8px' }}>
            <div className="card-header" style={{ backgroundColor: 'var(--discord-main)', borderColor: 'var(--discord-border)' }}>
              <h5 className="card-title mb-0 text-white">Catalog Items</h5>
              <p className="card-text text-discord-muted small mt-1 mb-0">
                Manage your existing catalog items here.
              </p>
            </div>
            <div className="card-body">
              {isLoading ? (
                <div className="d-flex align-items-center justify-content-center" style={{height: '10rem'}}>
                  <div className="spinner-border text-discord-muted" role="status">
                    <span className="visually-hidden">Loading...</span>
                  </div>
                </div>
              ) : catalogItems && Array.isArray(catalogItems) && catalogItems.length > 0 ? (
                <div className="table-responsive">
                  <table className="table table-hover" style={{ color: 'var(--discord-text)' }}>
                    <thead>
                      <tr>
                        <th>Name</th>
                        <th>Description</th>
                        <th>Price</th>
                        <th>Slug</th>
                        <th className="text-end">Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {Array.isArray(catalogItems) && catalogItems.map((item: CatalogItem) => (
                        <tr key={item.id}>
                          <td className="fw-bold">{item.name}</td>
                          <td>
                            {item.description.length > 30
                              ? `${item.description.substring(0, 30)}...`
                              : item.description}
                          </td>
                          <td>{item.price} pts</td>
                          <td>{item.slug}</td>
                          <td className="text-end">
                            <button
                              className="btn btn-discord-secondary btn-sm me-2"
                              onClick={() => handleEdit(item)}
                            >
                              <Pencil className="me-1" style={{height: '0.875rem', width: '0.875rem'}} /> Edit
                            </button>
                            <AlertDialog>
                              <AlertDialogTrigger asChild>
                                <button className="btn btn-discord-danger btn-sm">
                                  <Trash className="me-1" style={{height: '0.875rem', width: '0.875rem'}} /> Delete
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
                <div className="text-center py-5">
                  <p className="text-discord-muted">
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
