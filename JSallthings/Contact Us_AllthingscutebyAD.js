

// ---------------------------------------------------------------
// Mobile nav toggle
// ---------------------------------------------------------------
// Grab the hamburger button and the nav container.
const btn=document.getElementById('menu-btn'),nav=document.getElementById('nav');
// Toggle the "open" class on click and mirror the state to aria-expanded
// so screen readers know whether the menu is open.
btn.addEventListener('click',()=>{const o=nav.classList.toggle('open');btn.setAttribute('aria-expanded',o)});
 
// Sync the cart count in the site header (SiteStore is defined by the shared store script).
window.SiteStore.updateBadge();
 
// ---------------------------------------------------------------
// Contact form setup
// ---------------------------------------------------------------
// f: the contact form. s: the status element used for success and error messages.
const f=document.getElementById('form'),s=document.getElementById('status');
// The form's submit button, so it can be disabled and relabelled while sending.
const submitBtn=f.querySelector('button[type="submit"]');
 
// Google Apps Script web app URL that logs each message to a Google Sheet.
const SHEET_URL = 'https://script.google.com/macros/s/AKfycby2MxGm8oJeLjJblnLPwb4MLq3KVqgxn-x6Lou1DXXd-yqctfpu_zrFZf62U1zNnX9w/exec';
 
// ---------------------------------------------------------------
// Form submission
// ---------------------------------------------------------------
// Handle form submission without reloading the page.
f.addEventListener('submit', async e => {
  e.preventDefault();
 
  // Read and trim the field values.
  const name = f.elements.namedItem('name').value.trim();
  const email = f.elements.namedItem('email').value.trim();
  const message = f.elements.namedItem('message').value.trim();
  // Clear any error styling left over from a previous attempt.
  s.classList.remove('err');
 
  // Validate: name and message are required, and the email must look like name@domain.tld.
  if (!name || !message || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    s.classList.add('err');
    s.textContent = 'Please add your name, a valid email and a message.';
    return;
  }
 
  // Show a sending state and disable the button to prevent double submissions.
  // The original label is saved so it can be restored in the finally block.
  const originalText = submitBtn.textContent;
  submitBtn.textContent = 'Sending...';
  submitBtn.disabled = true;
  s.textContent = 'Sending your message...';
  // Tracks whether the message reached the database, so the error handler
  // can tell the user it was still saved if the email step fails.
  let inboxSaved = false;
 
  try {
    // Step 1: save the message to the Supabase "contact_messages" table (only if Supabase is configured).
    if (window.SiteStore.client) {
      const { error } = await window.SiteStore.client
        .from('contact_messages')
        .insert({ name, email, message });
      if (error) throw error;
      inboxSaved = true;
    }
 
    // Step 2: log the message to the Google Sheet.
    // Fire-and-forget: no-cors returns an opaque response, so success can't be read.
    // A sheet failure shouldn't block the email going through.
    fetch(SHEET_URL, {
      method: 'POST',
      mode: 'no-cors',
      body: new URLSearchParams({ name, email, message })
    }).catch(err => console.warn('Sheet logging failed:', err));
 
    // Step 3: send the email notification through Web3Forms, using the form's own fields.
    const response = await fetch('https://api.web3forms.com/submit', {
      method: 'POST',
      body: new FormData(f)
    });
    const data = await response.json();
    // Treat an HTTP error or an unsuccessful API result as a failure.
    if (!response.ok || !data.success) {
      throw new Error(data.message || 'Unable to send your message. Please try again.');
    }
 
    // Everything worked: confirm and clear the form.
    s.textContent = 'Your message has been sent. Thank you!';
    f.reset();
  } catch (error) {
    s.classList.add('err');
    if (inboxSaved) {
      // The message is stored, so clear the form to avoid duplicates, but warn that the email failed.
      s.textContent = 'Your message is saved in our inbox, but the email notification failed.';
      f.reset();
    } else {
      // Nothing was saved: keep the user's text in the form so they can retry.
      s.textContent = error.message || 'Unable to send your message. Please try again.';
    }
  } finally {
    // Always restore the button, whether the send succeeded or failed.
    submitBtn.textContent = originalText;
    submitBtn.disabled = false;
  }
});
