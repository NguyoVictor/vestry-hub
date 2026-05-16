/**
 * DATA VALIDATION AND UNIQUENESS SYSTEM
 * 
 * Prevents duplicate data and ensures data integrity across the application
 * Based on Martin Kleppmann's principles for data consistency
 */

import { supabase } from "@/integrations/supabase/client";
import { TABLES, COLS } from "./schema";
import { z } from "zod";

// ─── VALIDATION SCHEMAS ──────────────────────────────────────────────────────

export const MemberSchema = z.object({
  first_name: z.string().min(1, "First name is required").max(50, "First name too long"),
  last_name: z.string().min(1, "Last name is required").max(50, "Last name too long"),
  email: z.string().email("Invalid email address").toLowerCase(),
  phone: z.string().optional(),
  status: z.enum(['active', 'inactive', 'pending']).default('active'),
  membership_status: z.enum(['member', 'visitor', 'regular_attendee']).default('visitor'),
  gender: z.enum(['male', 'female', 'other']).optional(),
  date_of_birth: z.string().optional(),
});

export const FamilySchema = z.object({
  name: z.string().min(1, "Family name is required").max(100, "Family name too long"),
  description: z.string().optional(),
  address: z.string().optional(),
  city: z.string().optional(),
  phone: z.string().optional(),
});

export const GroupSchema = z.object({
  name: z.string().min(1, "Group name is required").max(100, "Group name too long"),
  description: z.string().optional(),
  group_type: z.string().min(1, "Group type is required"),
  meeting_day: z.string().optional(),
  meeting_time: z.string().optional(),
  location: z.string().optional(),
});

export const EventSchema = z.object({
  title: z.string().min(1, "Event title is required").max(200, "Event title too long"),
  description: z.string().optional(),
  event_date: z.string().min(1, "Event date is required"),
  start_time: z.string().optional(),
  end_time: z.string().optional(),
  location: z.string().optional(),
  capacity_limit: z.number().positive().optional(),
  registration_deadline: z.string().optional(),
});

// ─── UNIQUENESS VALIDATION CLASS ─────────────────────────────────────────────

export class UniquenessValidator {
  private tenantId: string;

  constructor(tenantId: string) {
    this.tenantId = tenantId;
  }

  /**
   * Check if a member with the given email already exists
   */
  async validateMemberEmail(email: string, excludeId?: string): Promise<void> {
    const query = supabase
      .from(TABLES.MEMBERS)
      .select('id, first_name, last_name, email')
      .eq(COLS.TENANT_ID, this.tenantId)
      .eq(COLS.EMAIL, email.toLowerCase());

    if (excludeId) {
      query.neq('id', excludeId);
    }

    const { data, error } = await query.maybeSingle();

    if (error) {
      throw new Error(`Failed to validate email uniqueness: ${error.message}`);
    }

    if (data) {
      throw new Error(
        `A member with email "${email}" already exists: ${data.first_name} ${data.last_name}`
      );
    }
  }

  /**
   * Check if a family with the given name already exists
   */
  async validateFamilyName(name: string, excludeId?: string): Promise<void> {
    const query = supabase
      .from(TABLES.FAMILIES)
      .select('id, name')
      .eq(COLS.TENANT_ID, this.tenantId)
      .eq('name', name.trim());

    if (excludeId) {
      query.neq('id', excludeId);
    }

    const { data, error } = await query.maybeSingle();

    if (error) {
      throw new Error(`Failed to validate family name uniqueness: ${error.message}`);
    }

    if (data) {
      throw new Error(
        `A family with the name "${name}" already exists. Please choose a different name.`
      );
    }
  }

  /**
   * Check if a group with the given name already exists
   */
  async validateGroupName(name: string, excludeId?: string): Promise<void> {
    const query = supabase
      .from(TABLES.GROUPS)
      .select('id, name')
      .eq(COLS.TENANT_ID, this.tenantId)
      .eq('name', name.trim());

    if (excludeId) {
      query.neq('id', excludeId);
    }

    const { data, error } = await query.maybeSingle();

    if (error) {
      throw new Error(`Failed to validate group name uniqueness: ${error.message}`);
    }

    if (data) {
      throw new Error(
        `A group with the name "${name}" already exists. Please choose a different name.`
      );
    }
  }

  /**
   * Check if an event with the same title and date already exists
   */
  async validateEventTitleDate(title: string, eventDate: string, excludeId?: string): Promise<void> {
    const query = supabase
      .from(TABLES.EVENTS)
      .select('id, title, event_date')
      .eq(COLS.TENANT_ID, this.tenantId)
      .eq('title', title.trim())
      .eq('event_date', eventDate);

    if (excludeId) {
      query.neq('id', excludeId);
    }

    const { data, error } = await query.maybeSingle();

    if (error) {
      throw new Error(`Failed to validate event uniqueness: ${error.message}`);
    }

    if (data) {
      throw new Error(
        `An event with the title "${title}" already exists on ${eventDate}. Please choose a different title or date.`
      );
    }
  }

  /**
   * Check if a member is already in a specific group
   */
  async validateGroupMembership(groupId: string, memberId: string): Promise<void> {
    const { data, error } = await supabase
      .from(TABLES.GROUP_MEMBERS)
      .select('id')
      .eq(COLS.TENANT_ID, this.tenantId)
      .eq('group_id', groupId)
      .eq('member_id', memberId)
      .maybeSingle();

    if (error) {
      throw new Error(`Failed to validate group membership: ${error.message}`);
    }

    if (data) {
      throw new Error(
        `This member is already part of the group. Duplicate memberships are not allowed.`
      );
    }
  }

  /**
   * Check if a member is already in a specific family
   */
  async validateFamilyMembership(familyId: string, memberId: string): Promise<void> {
    const { data, error } = await supabase
      .from(TABLES.FAMILY_MEMBERS)
      .select('id')
      .eq('family_id', familyId)
      .eq('member_id', memberId)
      .maybeSingle();

    if (error) {
      throw new Error(`Failed to validate family membership: ${error.message}`);
    }

    if (data) {
      throw new Error(
        `This member is already part of the family. Duplicate family memberships are not allowed.`
      );
    }
  }

  /**
   * Check if a member has already RSVP'd to an event
   */
  async validateEventRSVP(eventId: string, memberId: string): Promise<void> {
    const { data, error } = await supabase
      .from(TABLES.EVENT_RSVPS)
      .select('id, response')
      .eq('event_id', eventId)
      .eq('member_id', memberId)
      .maybeSingle();

    if (error) {
      throw new Error(`Failed to validate event RSVP: ${error.message}`);
    }

    if (data) {
      throw new Error(
        `This member has already RSVP'd to this event with response: ${data.response}`
      );
    }
  }
}

// ─── COMPREHENSIVE DATA VALIDATOR ────────────────────────────────────────────

export class DataValidator {
  private uniquenessValidator: UniquenessValidator;

  constructor(tenantId: string) {
    this.uniquenessValidator = new UniquenessValidator(tenantId);
  }

  /**
   * Validate and sanitize member data
   */
  async validateMember(data: any, excludeId?: string): Promise<z.infer<typeof MemberSchema>> {
    // Schema validation
    const validatedData = MemberSchema.parse(data);

    // Uniqueness validation
    await this.uniquenessValidator.validateMemberEmail(validatedData.email, excludeId);

    return validatedData;
  }

  /**
   * Validate and sanitize family data
   */
  async validateFamily(data: any, excludeId?: string): Promise<z.infer<typeof FamilySchema>> {
    // Schema validation
    const validatedData = FamilySchema.parse(data);

    // Uniqueness validation
    await this.uniquenessValidator.validateFamilyName(validatedData.name, excludeId);

    return validatedData;
  }

  /**
   * Validate and sanitize group data
   */
  async validateGroup(data: any, excludeId?: string): Promise<z.infer<typeof GroupSchema>> {
    // Schema validation
    const validatedData = GroupSchema.parse(data);

    // Uniqueness validation
    await this.uniquenessValidator.validateGroupName(validatedData.name, excludeId);

    return validatedData;
  }

  /**
   * Validate and sanitize event data
   */
  async validateEvent(data: any, excludeId?: string): Promise<z.infer<typeof EventSchema>> {
    // Schema validation
    const validatedData = EventSchema.parse(data);

    // Uniqueness validation
    await this.uniquenessValidator.validateEventTitleDate(
      validatedData.title,
      validatedData.event_date,
      excludeId
    );

    return validatedData;
  }

  /**
   * Validate group membership
   */
  async validateGroupMembership(groupId: string, memberId: string): Promise<void> {
    await this.uniquenessValidator.validateGroupMembership(groupId, memberId);
  }

  /**
   * Validate family membership
   */
  async validateFamilyMembership(familyId: string, memberId: string): Promise<void> {
    await this.uniquenessValidator.validateFamilyMembership(familyId, memberId);
  }

  /**
   * Validate event RSVP
   */
  async validateEventRSVP(eventId: string, memberId: string): Promise<void> {
    await this.uniquenessValidator.validateEventRSVP(eventId, memberId);
  }
}

// ─── VALIDATION ERROR TYPES ──────────────────────────────────────────────────

export class ValidationError extends Error {
  constructor(
    message: string,
    public field?: string,
    public code?: string
  ) {
    super(message);
    this.name = 'ValidationError';
  }
}

export class UniquenessError extends ValidationError {
  constructor(message: string, field: string) {
    super(message, field, 'UNIQUENESS_VIOLATION');
    this.name = 'UniquenessError';
  }
}

// ─── HELPER FUNCTIONS ────────────────────────────────────────────────────────

/**
 * Create a data validator instance for a specific tenant
 */
export function createDataValidator(tenantId: string): DataValidator {
  return new DataValidator(tenantId);
}

/**
 * Sanitize string input (trim, normalize)
 */
export function sanitizeString(input: string): string {
  return input.trim().replace(/\s+/g, ' ');
}

/**
 * Normalize email address
 */
export function normalizeEmail(email: string): string {
  return email.toLowerCase().trim();
}

/**
 * Validate phone number format (basic validation)
 */
export function validatePhoneNumber(phone: string): boolean {
  const phoneRegex = /^[\+]?[1-9][\d]{0,15}$/;
  return phoneRegex.test(phone.replace(/[\s\-\(\)]/g, ''));
}

/**
 * Format error message for user display
 */
export function formatValidationError(error: unknown): string {
  if (error instanceof z.ZodError) {
    const firstError = error.errors[0];
    return `${firstError.path.join('.')}: ${firstError.message}`;
  }

  if (error instanceof ValidationError) {
    return error.message;
  }

  if (error instanceof Error) {
    return error.message;
  }

  return 'An unknown validation error occurred';
}

// ─── BATCH VALIDATION ────────────────────────────────────────────────────────

export class BatchValidator {
  private validator: DataValidator;

  constructor(tenantId: string) {
    this.validator = new DataValidator(tenantId);
  }

  /**
   * Validate multiple members at once (for bulk import)
   */
  async validateMembers(members: any[]): Promise<{
    valid: Array<{ index: number; data: z.infer<typeof MemberSchema> }>;
    invalid: Array<{ index: number; error: string; data: any }>;
  }> {
    const valid: Array<{ index: number; data: z.infer<typeof MemberSchema> }> = [];
    const invalid: Array<{ index: number; error: string; data: any }> = [];

    for (let i = 0; i < members.length; i++) {
      try {
        const validatedData = await this.validator.validateMember(members[i]);
        valid.push({ index: i, data: validatedData });
      } catch (error) {
        invalid.push({
          index: i,
          error: formatValidationError(error),
          data: members[i]
        });
      }
    }

    return { valid, invalid };
  }
}

// ─── EXPORT MAIN FUNCTIONS ───────────────────────────────────────────────────

export {
  MemberSchema,
  FamilySchema,
  GroupSchema,
  EventSchema,
  UniquenessValidator,
  DataValidator,
  BatchValidator
};