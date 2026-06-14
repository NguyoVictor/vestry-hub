import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useChurch } from "@/contexts/ChurchContext";
import { TABLES } from "@/lib/schema";
import { toast } from "sonner";
import { usePermissions } from '@/hooks/usePermissions';
import { PermissionButton } from '@/components/shared/PermissionButton';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Plus, Users, MessageCircle, Edit, Trash2, Phone, User, Building2,
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { cn } from "@/lib/utils";

// WhatsApp green color
const WA_GREEN = "#25D366";

// Types
type WhatsAppContact = {
  id: string;
  name: string;
  title?: string;
  phone: string;
  avatar_url?: string;
  is_active: boolean;
};

type WhatsAppGroup = {
  id: string;
  name: string;
  description?: string;
  invite_link?: string;
  emoji: string;
  member_count: number;
  is_active: boolean;
};

// Contact Modal
function ContactModal({ 
  open, 
  onClose, 
  contact, 
  tenantId 
}: { 
  open: boolean; 
  onClose: () => void; 
  contact?: WhatsAppContact | null; 
  tenantId: string;
}) {
  const queryClient = useQueryClient();
  const { isReadOnly } = usePermissions();
  const readOnly = isReadOnly('communication_tools');
  const [form, setForm] = useState({
    name: "",
    title: "",
    phone: "",
    avatar_url: "",
    is_active: true,
  });

  // Pre-fill form when editing
  useEffect(() => {
    if (contact) {
      setForm({
        name: contact.name,
        title: contact.title || "",
        phone: contact.phone,
        avatar_url: contact.avatar_url || "",
        is_active: contact.is_active,
      });
    } else {
      setForm({
        name: "",
        title: "",
        phone: "",
        avatar_url: "",
        is_active: true,
      });
    }
  }, [contact]);

  const mutation = useMutation({
    mutationFn: async () => {
      if (readOnly) return;
      if (contact) {
        // Update existing contact
        const { error } = await supabase
          .from(TABLES.WHATSAPP_CONTACTS)
          .update({
            name: form.name,
            title: form.title || null,
            phone: form.phone,
            avatar_url: form.avatar_url || null,
            is_active: form.is_active,
            updated_at: new Date().toISOString(),
          })
          .eq("id", contact.id);
        if (error) throw error;
      } else {
        // Create new contact
        const { error } = await supabase
          .from(TABLES.WHATSAPP_CONTACTS)
          .insert({
            tenant_id: tenantId,
            name: form.name,
            title: form.title || null,
            phone: form.phone,
            avatar_url: form.avatar_url || null,
            is_active: form.is_active,
          });
        if (error) throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["whatsapp-contacts", tenantId] });
      toast.success(contact ? "Contact updated successfully" : "Contact added successfully");
      onClose();
    },
    onError: (error: any) => {
      toast.error(error.message || "Failed to save contact");
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.name.trim() || !form.phone.trim()) {
      toast.error("Name and phone are required");
      return;
    }
    mutation.mutate();
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="text-lg font-semibold">
            {contact ? "Edit Contact" : "Add Contact"}
          </DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4 pt-2">
          <div className="space-y-2">
            <Label htmlFor="name">Name *</Label>
            <Input
              id="name"
              value={form.name}
              onChange={(e) => setForm(f => ({ ...f, name: e.target.value }))}
              placeholder="John Doe"
              required
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="title">Title</Label>
            <Input
              id="title"
              value={form.title}
              onChange={(e) => setForm(f => ({ ...f, title: e.target.value }))}
              placeholder="Pastor, Elder, etc."
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="phone">Phone Number *</Label>
            <Input
              id="phone"
              value={form.phone}
              onChange={(e) => setForm(f => ({ ...f, phone: e.target.value }))}
              placeholder="+254 712 345 678"
              required
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="avatar_url">Avatar URL</Label>
            <Input
              id="avatar_url"
              value={form.avatar_url}
              onChange={(e) => setForm(f => ({ ...f, avatar_url: e.target.value }))}
              placeholder="https://example.com/avatar.jpg"
            />
          </div>
          <div className="flex items-center space-x-2">
            <Switch
              id="is_active"
              checked={form.is_active}
              onCheckedChange={(checked) => setForm(f => ({ ...f, is_active: checked }))}
            />
            <Label htmlFor="is_active">Active</Label>
          </div>
          <div className="flex gap-2 pt-2">
            <Button type="button" variant="outline" onClick={onClose} className="flex-1">
              Cancel
            </Button>
            <Button 
              type="submit" 
              disabled={mutation.isPending}
              className="flex-1"
              style={{ backgroundColor: WA_GREEN }}
            >
              {mutation.isPending ? "Saving..." : contact ? "Update" : "Add"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}

// Group Modal
function GroupModal({ 
  open, 
  onClose, 
  group, 
  tenantId 
}: { 
  open: boolean; 
  onClose: () => void; 
  group?: WhatsAppGroup | null; 
  tenantId: string;
}) {
  const queryClient = useQueryClient();
  const { isReadOnly } = usePermissions();
  const readOnly = isReadOnly('communication_tools');
  const [form, setForm] = useState({
    name: "",
    description: "",
    invite_link: "",
    emoji: "👥",
    member_count: 0,
    is_active: true,
  });

  // Pre-fill form when editing
  useEffect(() => {
    if (group) {
      setForm({
        name: group.name,
        description: group.description || "",
        invite_link: group.invite_link || "",
        emoji: group.emoji,
        member_count: group.member_count,
        is_active: group.is_active,
      });
    } else {
      setForm({
        name: "",
        description: "",
        invite_link: "",
        emoji: "👥",
        member_count: 0,
        is_active: true,
      });
    }
  }, [group]);

  const mutation = useMutation({
    mutationFn: async () => {
      if (readOnly) return;
      if (group) {
        // Update existing group
        const { error } = await supabase
          .from(TABLES.WHATSAPP_GROUPS)
          .update({
            name: form.name,
            description: form.description || null,
            invite_link: form.invite_link || null,
            emoji: form.emoji,
            member_count: form.member_count,
            is_active: form.is_active,
            updated_at: new Date().toISOString(),
          })
          .eq("id", group.id);
        if (error) throw error;
      } else {
        // Create new group
        const { error } = await supabase
          .from(TABLES.WHATSAPP_GROUPS)
          .insert({
            tenant_id: tenantId,
            name: form.name,
            description: form.description || null,
            invite_link: form.invite_link || null,
            emoji: form.emoji,
            member_count: form.member_count,
            is_active: form.is_active,
          });
        if (error) throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["whatsapp-groups", tenantId] });
      toast.success(group ? "Group updated successfully" : "Group added successfully");
      onClose();
    },
    onError: (error: any) => {
      toast.error(error.message || "Failed to save group");
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.name.trim()) {
      toast.error("Group name is required");
      return;
    }
    mutation.mutate();
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="text-lg font-semibold">
            {group ? "Edit Group" : "Add Group"}
          </DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4 pt-2">
          <div className="space-y-2">
            <Label htmlFor="name">Group Name *</Label>
            <Input
              id="name"
              value={form.name}
              onChange={(e) => setForm(f => ({ ...f, name: e.target.value }))}
              placeholder="Youth Group"
              required
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="description">Description</Label>
            <Textarea
              id="description"
              value={form.description}
              onChange={(e) => setForm(f => ({ ...f, description: e.target.value }))}
              placeholder="A group for young adults..."
              rows={3}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="invite_link">WhatsApp Invite Link</Label>
            <Input
              id="invite_link"
              value={form.invite_link}
              onChange={(e) => setForm(f => ({ ...f, invite_link: e.target.value }))}
              placeholder="https://chat.whatsapp.com/..."
            />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="emoji">Emoji</Label>
              <Input
                id="emoji"
                value={form.emoji}
                onChange={(e) => setForm(f => ({ ...f, emoji: e.target.value }))}
                placeholder="👥"
                maxLength={2}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="member_count">Member Count</Label>
              <Input
                id="member_count"
                type="number"
                value={form.member_count}
                onChange={(e) => setForm(f => ({ ...f, member_count: parseInt(e.target.value) || 0 }))}
                min="0"
              />
            </div>
          </div>
          <div className="flex items-center space-x-2">
            <Switch
              id="is_active"
              checked={form.is_active}
              onCheckedChange={(checked) => setForm(f => ({ ...f, is_active: checked }))}
            />
            <Label htmlFor="is_active">Active</Label>
          </div>
          <div className="flex gap-2 pt-2">
            <Button type="button" variant="outline" onClick={onClose} className="flex-1">
              Cancel
            </Button>
            <Button 
              type="submit" 
              disabled={mutation.isPending}
              className="flex-1"
              style={{ backgroundColor: WA_GREEN }}
            >
              {mutation.isPending ? "Saving..." : group ? "Update" : "Add"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}

// Main Component
export default function WhatsAppDirectory() {
  const { tenantId } = useChurch();
  const queryClient = useQueryClient();
  const { isReadOnly } = usePermissions();
  const readOnly = isReadOnly('communication_tools');
  const [activeTab, setActiveTab] = useState("individuals");
  const [contactModal, setContactModal] = useState<{ open: boolean; contact?: WhatsAppContact | null }>({ open: false });
  const [groupModal, setGroupModal] = useState<{ open: boolean; group?: WhatsAppGroup | null }>({ open: false });

  // Fetch contacts
  const { data: contacts = [], isLoading: contactsLoading } = useQuery({
    queryKey: ["whatsapp-contacts", tenantId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from(TABLES.WHATSAPP_CONTACTS)
        .select("*")
        .eq("tenant_id", tenantId)
        .order("name");
      if (error) throw error;
      return data as WhatsAppContact[];
    },
    staleTime: 300_000,
  });

  // Fetch groups
  const { data: groups = [], isLoading: groupsLoading } = useQuery({
    queryKey: ["whatsapp-groups", tenantId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from(TABLES.WHATSAPP_GROUPS)
        .select("*")
        .eq("tenant_id", tenantId)
        .order("name");
      if (error) throw error;
      return data as WhatsAppGroup[];
    },
    staleTime: 300_000,
  });

  // Delete mutations
  const deleteContactMutation = useMutation({
    mutationFn: async (contactId: string) => {
      if (readOnly) return;
      const { error } = await supabase
        .from(TABLES.WHATSAPP_CONTACTS)
        .delete()
        .eq("id", contactId);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["whatsapp-contacts", tenantId] });
      toast.success("Contact deleted successfully");
    },
    onError: (error: any) => {
      toast.error(error.message || "Failed to delete contact");
    },
  });

  const deleteGroupMutation = useMutation({
    mutationFn: async (groupId: string) => {
      if (readOnly) return;
      const { error } = await supabase
        .from(TABLES.WHATSAPP_GROUPS)
        .delete()
        .eq("id", groupId);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["whatsapp-groups", tenantId] });
      toast.success("Group deleted successfully");
    },
    onError: (error: any) => {
      toast.error(error.message || "Failed to delete group");
    },
  });

  // Generate initials for avatar
  const getInitials = (name: string) => {
    return name
      .split(" ")
      .map(n => n[0])
      .join("")
      .toUpperCase()
      .slice(0, 2);
  };

  // Animation variants
  const containerVariants = {
    hidden: { opacity: 0 },
    show: {
      opacity: 1,
      transition: {
        staggerChildren: 0.06,
      },
    },
  };

  const itemVariants = {
    hidden: { opacity: 0, y: 20 },
    show: { opacity: 1, y: 0 },
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 font-jakarta">WhatsApp Directory</h1>
          <p className="text-sm text-slate-500 mt-0.5 font-jakarta">
            Manage WhatsApp contacts and groups for your church
          </p>
        </div>
        <div className="flex items-center gap-2">
          <MessageCircle className="h-5 w-5" style={{ color: WA_GREEN }} />
          <span className="text-sm font-medium" style={{ color: WA_GREEN }}>
            WhatsApp Business
          </span>
        </div>
      </div>

      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <div className="flex items-center justify-between mb-6">
          <TabsList className="grid w-fit grid-cols-2">
            <TabsTrigger value="individuals" className="relative">
              <Users className="h-4 w-4 mr-2" />
              Individuals
              {activeTab === "individuals" && (
                <motion.div
                  layoutId="activeTab"
                  className="absolute bottom-0 left-0 right-0 h-0.5"
                  style={{ backgroundColor: WA_GREEN }}
                />
              )}
            </TabsTrigger>
            <TabsTrigger value="groups" className="relative">
              <MessageCircle className="h-4 w-4 mr-2" />
              Groups
              {activeTab === "groups" && (
                <motion.div
                  layoutId="activeTab"
                  className="absolute bottom-0 left-0 right-0 h-0.5"
                  style={{ backgroundColor: WA_GREEN }}
                />
              )}
            </TabsTrigger>
          </TabsList>

          <PermissionButton
            permission="communication_tools"
            readOnly={readOnly}
            onClick={() => {
              if (activeTab === "individuals") {
                setContactModal({ open: true, contact: null });
              } else {
                setGroupModal({ open: true, group: null });
              }
            }}
            className="gap-2"
            style={{ backgroundColor: WA_GREEN }}
          >
            <Plus className="h-4 w-4" />
            Add {activeTab === "individuals" ? "Individual" : "Group"}
          </PermissionButton>
        </div>

        <AnimatePresence mode="wait">
          <TabsContent value="individuals" className="mt-0">
            {contactsLoading ? (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {Array.from({ length: 6 }).map((_, i) => (
                  <Skeleton key={i} className="h-32 w-full" />
                ))}
              </div>
            ) : contacts.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-16 gap-3 text-center">
                <User className="h-12 w-12 text-slate-300" />
                <p className="text-base font-semibold text-slate-600 font-jakarta">No contacts yet</p>
                <p className="text-sm text-slate-400 max-w-sm font-jakarta">
                  Add WhatsApp contacts to help members connect with church staff directly.
                </p>
                <PermissionButton
                  permission="communication_tools"
                  readOnly={readOnly}
                  size="sm"
                  className="mt-2"
                  style={{ backgroundColor: WA_GREEN }}
                  onClick={() => setContactModal({ open: true, contact: null })}
                >
                  <Plus className="h-4 w-4 mr-1.5" />
                  Add First Contact
                </PermissionButton>
              </div>
            ) : (
              <motion.div
                variants={containerVariants}
                initial="hidden"
                animate="show"
                className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4"
              >
                {contacts.map((contact) => (
                  <motion.div
                    key={contact.id}
                    variants={itemVariants}
                    whileHover={{ scale: 1.02, y: -2 }}
                    className="bg-white rounded-xl border border-slate-200 p-5 shadow-sm transition-shadow duration-200 hover:shadow-md"
                  >
                    <div className="flex items-start justify-between mb-3">
                      <div className="flex items-center gap-3">
                        {contact.avatar_url ? (
                          <img
                            src={contact.avatar_url}
                            alt={contact.name}
                            className="h-10 w-10 rounded-full object-cover"
                          />
                        ) : (
                          <div className="h-10 w-10 rounded-full bg-gradient-to-br from-orange-400 to-orange-500 flex items-center justify-center text-white font-bold text-sm">
                            {getInitials(contact.name)}
                          </div>
                        )}
                        <div>
                          <h3 className="font-semibold text-slate-900 font-jakarta">{contact.name}</h3>
                          {contact.title && (
                            <p className="text-xs text-slate-500 font-jakarta">{contact.title}</p>
                          )}
                        </div>
                      </div>
                      <div className="flex items-center gap-1">
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => setContactModal({ open: true, contact })}
                          className="h-8 w-8 p-0"
                        >
                          <Edit className="h-4 w-4" />
                        </Button>
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => deleteContactMutation.mutate(contact.id)}
                          className="h-8 w-8 p-0 text-red-500 hover:text-red-600"
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                    <div className="flex items-center gap-2 text-sm text-slate-600">
                      <Phone className="h-4 w-4" />
                      <span className="font-jakarta">{contact.phone}</span>
                    </div>
                    <div className="mt-3 flex items-center justify-between">
                      <span
                        className={cn(
                          "inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium",
                          contact.is_active
                            ? "bg-emerald-100 text-emerald-700"
                            : "bg-slate-100 text-slate-600"
                        )}
                      >
                        {contact.is_active ? "Active" : "Inactive"}
                      </span>
                    </div>
                  </motion.div>
                ))}
              </motion.div>
            )}
          </TabsContent>

          <TabsContent value="groups" className="mt-0">
            {groupsLoading ? (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {Array.from({ length: 6 }).map((_, i) => (
                  <Skeleton key={i} className="h-32 w-full" />
                ))}
              </div>
            ) : groups.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-16 gap-3 text-center">
                <MessageCircle className="h-12 w-12 text-slate-300" />
                <p className="text-base font-semibold text-slate-600 font-jakarta">No groups yet</p>
                <p className="text-sm text-slate-400 max-w-sm font-jakarta">
                  Add WhatsApp groups to help members join community discussions.
                </p>
                <PermissionButton
                  permission="communication_tools"
                  readOnly={readOnly}
                  size="sm"
                  className="mt-2"
                  style={{ backgroundColor: WA_GREEN }}
                  onClick={() => setGroupModal({ open: true, group: null })}
                >
                  <Plus className="h-4 w-4 mr-1.5" />
                  Add First Group
                </PermissionButton>
              </div>
            ) : (
              <motion.div
                variants={containerVariants}
                initial="hidden"
                animate="show"
                className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4"
              >
                {groups.map((group) => (
                  <motion.div
                    key={group.id}
                    variants={itemVariants}
                    whileHover={{ scale: 1.02, y: -2 }}
                    className="bg-white rounded-xl border border-slate-200 p-5 shadow-sm transition-shadow duration-200 hover:shadow-md"
                  >
                    <div className="flex items-start justify-between mb-3">
                      <div className="flex items-center gap-3">
                        <div className="h-10 w-10 rounded-full bg-slate-100 flex items-center justify-center text-lg">
                          {group.emoji}
                        </div>
                        <div>
                          <h3 className="font-semibold text-slate-900 font-jakarta">{group.name}</h3>
                          <div className="flex items-center gap-1 mt-1">
                            <Users className="h-3 w-3 text-slate-400" />
                            <span className="text-xs text-slate-500 font-jakarta">
                              {group.member_count} members
                            </span>
                          </div>
                        </div>
                      </div>
                      <div className="flex items-center gap-1">
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => setGroupModal({ open: true, group })}
                          className="h-8 w-8 p-0"
                        >
                          <Edit className="h-4 w-4" />
                        </Button>
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => deleteGroupMutation.mutate(group.id)}
                          className="h-8 w-8 p-0 text-red-500 hover:text-red-600"
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                    {group.description && (
                      <p className="text-sm text-slate-600 mb-3 font-jakarta line-clamp-2">
                        {group.description}
                      </p>
                    )}
                    <div className="flex items-center justify-between">
                      <span
                        className={cn(
                          "inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium",
                          group.is_active
                            ? "bg-emerald-100 text-emerald-700"
                            : "bg-slate-100 text-slate-600"
                        )}
                      >
                        {group.is_active ? "Active" : "Inactive"}
                      </span>
                      {group.invite_link && (
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => window.open(group.invite_link, "_blank")}
                          className="text-xs h-7"
                        >
                          View Link
                        </Button>
                      )}
                    </div>
                  </motion.div>
                ))}
              </motion.div>
            )}
          </TabsContent>
        </AnimatePresence>
      </Tabs>

      {/* Modals */}
      <ContactModal
        open={contactModal.open}
        onClose={() => setContactModal({ open: false })}
        contact={contactModal.contact}
        tenantId={tenantId!}
      />
      <GroupModal
        open={groupModal.open}
        onClose={() => setGroupModal({ open: false })}
        group={groupModal.group}
        tenantId={tenantId!}
      />
    </div>
  );
}