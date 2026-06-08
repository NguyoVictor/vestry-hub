import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useMemberPortal } from "@/contexts/MemberPortalContext";
import { TABLES } from "@/lib/schema";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Skeleton } from "@/components/ui/skeleton";
import {
  MessageCircle, Users, Phone, User, ExternalLink, Search,
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

// WhatsApp green color
const WA_GREEN = "#25D366";
const WA_DARK_GREEN = "#128C7E";

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

export default function MemberWhatsApp() {
  const memberPortal = useMemberPortal();
  const [activeTab, setActiveTab] = useState("individuals");
  const [searchQuery, setSearchQuery] = useState("");

  // Fetch contacts
  const { data: contacts = [], isLoading: contactsLoading } = useQuery({
    queryKey: ["whatsapp-contacts", memberPortal.tenantId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from(TABLES.WHATSAPP_CONTACTS)
        .select("*")
        .eq("tenant_id", memberPortal.tenantId)
        .eq("is_active", true)
        .order("name");
      if (error) throw error;
      return data as WhatsAppContact[];
    },
    staleTime: 300_000,
  });

  // Fetch groups
  const { data: groups = [], isLoading: groupsLoading } = useQuery({
    queryKey: ["whatsapp-groups", memberPortal.tenantId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from(TABLES.WHATSAPP_GROUPS)
        .select("*")
        .eq("tenant_id", memberPortal.tenantId)
        .eq("is_active", true)
        .order("name");
      if (error) throw error;
      return data as WhatsAppGroup[];
    },
    staleTime: 300_000,
  });

  // Filter contacts and groups based on search
  const filteredContacts = contacts.filter(contact =>
    contact.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    (contact.title && contact.title.toLowerCase().includes(searchQuery.toLowerCase()))
  );

  const filteredGroups = groups.filter(group =>
    group.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    (group.description && group.description.toLowerCase().includes(searchQuery.toLowerCase()))
  );

  // Generate initials for avatar
  const getInitials = (name: string) => {
    return name
      .split(" ")
      .map(n => n[0])
      .join("")
      .toUpperCase()
      .slice(0, 2);
  };

  // Format phone number for WhatsApp (remove non-digits and format as international)
  const formatPhoneForWhatsApp = (phone: string) => {
    const digits = phone.replace(/\D/g, "");
    // If starts with 0, replace with 254 (Kenya)
    if (digits.startsWith("0")) {
      return "254" + digits.slice(1);
    }
    // If starts with 254, use as is
    if (digits.startsWith("254")) {
      return digits;
    }
    // Otherwise, assume it needs 254 prefix
    return "254" + digits;
  };

  // Open WhatsApp chat
  const openWhatsAppChat = (phone: string) => {
    const formattedPhone = formatPhoneForWhatsApp(phone);
    window.open(`https://wa.me/${formattedPhone}`, "_blank");
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
    <div className="min-h-screen bg-gradient-to-br from-green-50 to-emerald-50">
      {/* Header with WhatsApp gradient */}
      <div 
        className="bg-gradient-to-r text-white px-6 py-8"
        style={{ 
          background: `linear-gradient(135deg, ${WA_GREEN} 0%, ${WA_DARK_GREEN} 100%)` 
        }}
      >
        <div className="max-w-4xl mx-auto">
          <div className="flex items-center gap-3 mb-2">
            <MessageCircle className="h-8 w-8" />
            <h1 className="text-2xl font-bold font-jakarta">WhatsApp Directory</h1>
          </div>
          <p className="text-green-100 font-jakarta">
            Connect with church staff and join community groups on WhatsApp
          </p>
        </div>
      </div>

      <div className="max-w-4xl mx-auto px-6 py-8">
        {/* Search Bar */}
        <div className="relative mb-6">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-slate-400" />
          <Input
            placeholder="Search contacts or groups..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10 h-12 border-slate-200 focus:border-green-500 focus:ring-2 focus:ring-green-500/10 font-jakarta"
          />
        </div>

        {/* Tabs */}
        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <div className="flex items-center justify-center mb-8">
            <TabsList className="grid w-fit grid-cols-2 bg-white border border-slate-200">
              <TabsTrigger value="individuals" className="relative data-[state=active]:bg-green-50 data-[state=active]:text-green-700">
                <Users className="h-4 w-4 mr-2" />
                Individuals
                {activeTab === "individuals" && (
                  <motion.div
                    layoutId="activeTab"
                    className="absolute bottom-0 left-0 right-0 h-0.5 bg-green-500"
                  />
                )}
              </TabsTrigger>
              <TabsTrigger value="groups" className="relative data-[state=active]:bg-green-50 data-[state=active]:text-green-700">
                <MessageCircle className="h-4 w-4 mr-2" />
                Groups
                {activeTab === "groups" && (
                  <motion.div
                    layoutId="activeTab"
                    className="absolute bottom-0 left-0 right-0 h-0.5 bg-green-500"
                  />
                )}
              </TabsTrigger>
            </TabsList>
          </div>

          <AnimatePresence>
            <TabsContent key="individuals" value="individuals" className="mt-0">
              {contactsLoading ? (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {Array.from({ length: 6 }).map((_, i) => (
                    <Skeleton key={i} className="h-40 w-full" />
                  ))}
                </div>
              ) : filteredContacts.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-16 gap-3 text-center">
                  <User className="h-12 w-12 text-slate-300" />
                  <p className="text-base font-semibold text-slate-600 font-jakarta">
                    {contacts.length === 0 
                      ? "Your church hasn't added any WhatsApp contacts yet" 
                      : "No contacts match your search"
                    }
                  </p>
                  <p className="text-sm text-slate-400 max-w-sm font-jakarta">
                    {contacts.length === 0 
                      ? "Check back later when your church adds WhatsApp contacts for staff members."
                      : "Try searching with different keywords."
                    }
                  </p>
                </div>
              ) : (
                <motion.div
                  variants={containerVariants}
                  initial="hidden"
                  animate="show"
                  className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4"
                >
                  {filteredContacts.map((contact) => (
                    <motion.div
                      key={contact.id}
                      variants={itemVariants}
                      whileHover={{ scale: 1.02, y: -2 }}
                      className="bg-white rounded-xl border border-slate-200 p-6 shadow-sm transition-all duration-200 hover:shadow-md"
                    >
                      <div className="flex items-center gap-4 mb-4">
                        {contact.avatar_url ? (
                          <img
                            src={contact.avatar_url}
                            alt={contact.name}
                            className="h-12 w-12 rounded-full object-cover"
                          />
                        ) : (
                          <div className="h-12 w-12 rounded-full bg-gradient-to-br from-orange-400 to-orange-500 flex items-center justify-center text-white font-bold text-sm">
                            {getInitials(contact.name)}
                          </div>
                        )}
                        <div className="flex-1">
                          <h3 className="font-semibold text-slate-900 font-jakarta">{contact.name}</h3>
                          {contact.title && (
                            <p className="text-sm text-slate-500 font-jakarta">{contact.title}</p>
                          )}
                        </div>
                      </div>
                      
                      <div className="flex items-center gap-2 text-sm text-slate-600 mb-4">
                        <Phone className="h-4 w-4" />
                        <span className="font-jakarta">{contact.phone}</span>
                      </div>

                      <Button
                        onClick={() => openWhatsAppChat(contact.phone)}
                        className="w-full gap-2 text-white font-semibold"
                        style={{ backgroundColor: WA_GREEN }}
                      >
                        <MessageCircle className="h-4 w-4" />
                        Chat
                        <ExternalLink className="h-3 w-3" />
                      </Button>
                    </motion.div>
                  ))}
                </motion.div>
              )}
            </TabsContent>

            <TabsContent key="groups" value="groups" className="mt-0">
              {groupsLoading ? (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {Array.from({ length: 6 }).map((_, i) => (
                    <Skeleton key={i} className="h-40 w-full" />
                  ))}
                </div>
              ) : filteredGroups.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-16 gap-3 text-center">
                  <MessageCircle className="h-12 w-12 text-slate-300" />
                  <p className="text-base font-semibold text-slate-600 font-jakarta">
                    {groups.length === 0 
                      ? "Your church hasn't added any WhatsApp groups yet" 
                      : "No groups match your search"
                    }
                  </p>
                  <p className="text-sm text-slate-400 max-w-sm font-jakarta">
                    {groups.length === 0 
                      ? "Check back later when your church creates WhatsApp groups for community discussions."
                      : "Try searching with different keywords."
                    }
                  </p>
                </div>
              ) : (
                <motion.div
                  variants={containerVariants}
                  initial="hidden"
                  animate="show"
                  className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4"
                >
                  {filteredGroups.map((group) => (
                    <motion.div
                      key={group.id}
                      variants={itemVariants}
                      whileHover={{ scale: 1.02, y: -2 }}
                      className="bg-white rounded-xl border border-slate-200 p-6 shadow-sm transition-all duration-200 hover:shadow-md"
                    >
                      <div className="flex items-center gap-4 mb-4">
                        <div className="h-12 w-12 rounded-full bg-slate-100 flex items-center justify-center text-2xl">
                          {group.emoji}
                        </div>
                        <div className="flex-1">
                          <h3 className="font-semibold text-slate-900 font-jakarta">{group.name}</h3>
                          <div className="flex items-center gap-1 mt-1">
                            <Users className="h-3 w-3 text-slate-400" />
                            <span className="text-sm text-slate-500 font-jakarta">
                              {group.member_count} members
                            </span>
                          </div>
                        </div>
                      </div>
                      
                      {group.description && (
                        <p className="text-sm text-slate-600 mb-4 font-jakarta line-clamp-3">
                          {group.description}
                        </p>
                      )}

                      <Button
                        onClick={() => group.invite_link && window.open(group.invite_link, "_blank")}
                        disabled={!group.invite_link}
                        className="w-full gap-2 text-white font-semibold"
                        style={{ backgroundColor: group.invite_link ? WA_GREEN : "#94a3b8" }}
                      >
                        <MessageCircle className="h-4 w-4" />
                        {group.invite_link ? "Join Group" : "No Link Available"}
                        {group.invite_link && <ExternalLink className="h-3 w-3" />}
                      </Button>
                    </motion.div>
                  ))}
                </motion.div>
              )}
            </TabsContent>
          </AnimatePresence>
        </Tabs>
      </div>
    </div>
  );
}