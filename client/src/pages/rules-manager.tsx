import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { queryClient } from "@/lib/queryClient";
import { apiRequest } from "@/lib/queryClient";
import { Rule } from "@shared/schema";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useToast } from "@/hooks/use-toast";
import { z } from "zod";
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

// Type definition for the form
type FormData = {
  name: string;
  description: string;
};

export default function RulesManager() {
  const [isEditing, setIsEditing] = useState(false);
  const [currentRuleId, setCurrentRuleId] = useState<number | null>(null);
  const { toast } = useToast();

  // Fetch rules
  const { data: rulesRaw, isLoading } = useQuery<Rule[]>({
    queryKey: ["/api/rules"],
  });
  
  // Sort rules by ID
  const rules = rulesRaw ? [...rulesRaw] : [];

  // Form setup
  const form = useForm<FormData>({
    resolver: zodResolver(z.object({
      name: z.string().min(1, "Name is required"),
      description: z.string().min(1, "Description is required"),
    })),
    defaultValues: {
      name: "",
      description: ""
    },
  });

  // Create mutation
  const createMutation = useMutation({
    mutationFn: async (data: FormData & { type: string, parameters: string }) => {
      const response = await apiRequest("POST", "/api/rules", data);
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || "Failed to create rule");
      }
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/rules"] });
      form.reset();
      toast({
        title: "Success",
        description: "Rule created successfully",
      });
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to create rule",
        variant: "destructive",
      });
    },
  });

  // Update mutation
  const updateMutation = useMutation({
    mutationFn: async (data: FormData & { id: number, type: string, parameters: string }) => {
      const { id, ...ruleData } = data;

      const response = await apiRequest("PUT", `/api/rules/${id}`, ruleData);
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || "Failed to update rule");
      }
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/rules"] });
      form.reset();
      setIsEditing(false);
      setCurrentRuleId(null);
      toast({
        title: "Success",
        description: "Rule updated successfully",
      });
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to update rule",
        variant: "destructive",
      });
    },
  });

  // Delete mutation
  const deleteMutation = useMutation({
    mutationFn: async (id: number) => {
      const response = await apiRequest("DELETE", `/api/rules/${id}`);
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || "Failed to delete rule");
      }
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/rules"] });
      toast({
        title: "Success",
        description: "Rule deleted successfully",
      });
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to delete rule",
        variant: "destructive",
      });
    },
  });

  // Form submission handler
  const onSubmit = (data: FormData) => {
    // Add default type and parameters
    const enhancedData = {
      ...data,
      type: "bargain",
      parameters: JSON.stringify({ discountPercentage: 10 })
    };

    if (isEditing && currentRuleId) {
      updateMutation.mutate({ ...enhancedData, id: currentRuleId });
    } else {
      createMutation.mutate(enhancedData);
    }
  };

  // Edit rule handler
  const handleEdit = (rule: Rule) => {
    setIsEditing(true);
    setCurrentRuleId(rule.id);
    form.reset({
      name: rule.name,
      description: rule.description
    });
  };

  // Cancel edit handler
  const handleCancelEdit = () => {
    setIsEditing(false);
    setCurrentRuleId(null);
    form.reset();
  };

  return (
    <div className="container-fluid py-4" style={{ backgroundColor: 'var(--discord-dark)', minHeight: '100vh' }}>
      <div className="d-flex justify-content-between align-items-center mb-4">
        <div>
          <h1 className="fs-4 fw-bold mb-2 text-white">Rules Manager</h1>
          <p className="text-discord-muted">
            Add, edit, or remove special rules like bargaining.
          </p>
        </div>
        <Link href="/">
          <button className="btn btn-discord-secondary">
            <ArrowLeft style={{ marginRight: '0.5rem', height: '1rem', width: '1rem' }} /> Back to Chat
          </button>
        </Link>
      </div>

      <div className="row gy-4">
        {/* Rule Form */}
        <div className="col-12 col-md-4">
          <div className="card h-100" style={{ backgroundColor: 'var(--discord-main)', borderColor: 'var(--discord-border)', borderRadius: '8px' }}>
            <div className="card-header" style={{ backgroundColor: 'var(--discord-main)', borderColor: 'var(--discord-border)' }}>
              <h5 className="card-title mb-0 text-white">{isEditing ? "Edit Rule" : "Add New Rule"}</h5>
              <p className="card-text text-discord-muted small mt-1 mb-0">
                {isEditing
                  ? "Edit the rule details"
                  : "Fill out the form to add a new special rule"}
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
                          <input type="text" className="form-control" style={{ backgroundColor: 'var(--discord-input)', color: 'var(--discord-text)', borderColor: 'var(--discord-border)' }} placeholder="Bargain" {...field} />
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
                            placeholder="Allow users to bargain for lower prices" 
                            rows={3}
                            {...field}
                          />
                          <FormMessage />
                        </div>
                      )}
                    />
                  </div>

                  {/* Type and parameters are set automatically by the backend */}

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
                      {isEditing ? "Update" : "Add"} Rule
                    </button>
                  </div>
                </form>
              </Form>
            </div>
          </div>
        </div>

        {/* Rules List */}
        <div className="col-12 col-md-8">
          <div className="card h-100" style={{ backgroundColor: 'var(--discord-main)', borderColor: 'var(--discord-border)', borderRadius: '8px' }}>
            <div className="card-header" style={{ backgroundColor: 'var(--discord-main)', borderColor: 'var(--discord-border)' }}>
              <h5 className="card-title mb-0 text-white">Special Rules</h5>
              <p className="card-text text-discord-muted small mt-1 mb-0">
                Manage your special rules here.
              </p>
            </div>
            <div className="card-body">
              {isLoading ? (
                <div className="d-flex align-items-center justify-content-center" style={{height: '10rem'}}>
                  <div className="spinner-border text-discord-muted" role="status">
                    <span className="visually-hidden">Loading...</span>
                  </div>
                </div>
              ) : rules && Array.isArray(rules) && rules.length > 0 ? (
                <div className="table-responsive">
                  <table className="table table-hover" style={{ color: 'var(--discord-text)' }}>
                    <thead>
                      <tr>
                        <th>Name</th>
                        <th>Description</th>
                        <th>Type</th>
                        <th>Status</th>
                        <th className="text-end">Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {Array.isArray(rules) && rules.map((rule: Rule) => (
                        <tr key={rule.id}>
                          <td className="fw-bold">{rule.name}</td>
                          <td>
                            {rule.description.length > 30
                              ? `${rule.description.substring(0, 30)}...`
                              : rule.description}
                          </td>
                          <td>{rule.type}</td>
                          <td>
                            <span className={`badge ${rule.isActive === 1 ? 'bg-success' : 'bg-danger'}`}>
                              {rule.isActive === 1 ? 'Active' : 'Inactive'}
                            </span>
                          </td>
                          <td className="text-end">
                            <button
                              className="btn btn-discord-secondary btn-sm me-2"
                              onClick={() => handleEdit(rule)}
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
                                    Are you sure you want to delete this rule?
                                  </AlertDialogTitle>
                                  <AlertDialogDescription>
                                    This action cannot be undone. All associated functionalities will stop working.
                                  </AlertDialogDescription>
                                </AlertDialogHeader>
                                <AlertDialogFooter>
                                  <AlertDialogCancel>Cancel</AlertDialogCancel>
                                  <AlertDialogAction
                                    onClick={() => deleteMutation.mutate(rule.id)}
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
                    No rules found. Add your first rule using the form.
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
