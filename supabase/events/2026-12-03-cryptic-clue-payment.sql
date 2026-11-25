-- Cryptic Clue: ₹200 entry per team, paid by UPI while registering.
-- Run AFTER re-running supabase/schema.sql (it adds the payment columns).
-- The QR (public/payments/cryptic-clue-upi.webp) decodes to the UPI ID below with ₹200 set.
update public.techspark_events
set payment_required = true,
    entry_fee        = 200,
    upi_id           = 'vijayraghavendram18@okhdfcbank',
    upi_name         = 'Vijayaraghavendra M',
    payment_qr       = '/payments/cryptic-clue-upi.webp',
    payment_note     = 'One payment per team. Keep the UTR from your UPI app.'
where slug = 'cryptic-clue-treasure-hunt';

select title, payment_required, entry_fee, upi_id, payment_qr from public.techspark_events where slug = 'cryptic-clue-treasure-hunt';
