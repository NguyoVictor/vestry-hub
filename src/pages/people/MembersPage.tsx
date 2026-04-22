// MembersPage.tsx — main Members page component
// Imports helpers from Members.tsx (StatusPill, FilterDropdown, ImportMembersModal, etc.)
import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Helmet } from "react-helmet-async";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { motion, AnimatePresence } from "framer-motion";
import { supabase } from "@/integrations/supabase/client";
import { useChurch } from "@/contexts/ChurchContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { toast } from "sonner";
import {
  UserPlus, Users, MoreHorizontal, Eye, Trash2, Mail, MessageSquare,
  Copy, CheckCircle2, Search, QrCode, Upload, Download, LayoutGrid,
  List, ChevronDown, Phone, MapPin, Calendar, X, FileText,
  ChevronLeft, ChevronRight,
} from "lucide-react";
import { format, subDays, startOfMonth, startOfYear } from "date-fns";
import { z } from "zod";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { logActivity } from "@/lib/activityLogger";
import { captureEvent } from "@/lib/monitoring";
import { cn } from "@/lib/utils";

// Re-export everything from Members.tsx helpers
export { default } from "./Members";
