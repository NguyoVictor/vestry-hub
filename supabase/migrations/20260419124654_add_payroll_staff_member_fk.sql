ALTER TABLE payroll_staff
  ADD CONSTRAINT payroll_staff_member_id_fkey
  FOREIGN KEY (member_id) REFERENCES members(id) ON DELETE SET NULL;;
