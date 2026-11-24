-- Automatically mark the matching scheduled appointment as completed when
-- an attendance is recorded for the same doctor/patient/date.

CREATE OR REPLACE FUNCTION public.handle_attendance_completes_appointment()
RETURNS TRIGGER AS $$
BEGIN
  UPDATE public.appointments
  SET status = 'completed'
  WHERE id = (
    SELECT id FROM public.appointments
    WHERE doctor_id = NEW.doctor_id
      AND patient_id = NEW.patient_id
      AND appointment_date = NEW.attendance_date
      AND status = 'scheduled'
    ORDER BY abs(extract(epoch FROM (appointment_time - NEW.attendance_time)))
    LIMIT 1
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER on_attendance_created_complete_appointment
  AFTER INSERT ON public.attendances
  FOR EACH ROW EXECUTE FUNCTION public.handle_attendance_completes_appointment();
