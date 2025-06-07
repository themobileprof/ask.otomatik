const { google } = require('googleapis');

// Helper to add event to Google Calendar
async function addBookingToGoogleCalendar(booking) {
  const oauth2Client = new google.auth.OAuth2(
    process.env.GOOGLE_CLIENT_ID,
    process.env.GOOGLE_CLIENT_SECRET
  );

  // Use refresh token if available
  if (process.env.GOOGLE_REFRESH_TOKEN) {
    oauth2Client.setCredentials({ refresh_token: process.env.GOOGLE_REFRESH_TOKEN });
    try {
      // Get a new access token using the refresh token
      await oauth2Client.getAccessToken();
    } catch (err) {
      console.error('Failed to refresh Google access token:', err.message);
      return;
    }
  } else if (process.env.GOOGLE_ACCESS_TOKEN) {
    oauth2Client.setCredentials({ access_token: process.env.GOOGLE_ACCESS_TOKEN });
  } else {
    console.warn('Google Calendar sync skipped: missing credentials');
    return;
  }

  // Calculate end time for the event
  let endTime = booking.endTime;
  if (!endTime) {
    // If no endTime provided, calculate based on booking type
    const startTime = booking.time;
    const [hours, minutes, period] = startTime.match(/(\d+):(\d+)\s*([AP]M)/).slice(1);
    let hour = parseInt(hours);
    if (period === 'PM' && hour !== 12) hour += 12;
    if (period === 'AM' && hour === 12) hour = 0;
    
    // Add 30 minutes for free consultations, 1 hour for paid
    const durationMinutes = booking.type === 'free' ? 30 : 60;
    let endHour = hour;
    let endMinute = parseInt(minutes) + durationMinutes;
    
    if (endMinute >= 60) {
      endHour = (endHour + Math.floor(endMinute / 60)) % 24;
      endMinute = endMinute % 60;
    }
    
    // Convert back to 12-hour format
    let endPeriod = endHour >= 12 ? 'PM' : 'AM';
    if (endHour > 12) endHour -= 12;
    if (endHour === 0) endHour = 12;
    
    endTime = `${endHour}:${endMinute.toString().padStart(2, '0')} ${endPeriod}`;
  }

  const calendar = google.calendar({ version: 'v3', auth: oauth2Client });
  const event = {
    summary: `Consulting Session: ${booking.email}`,
    description: `Type: ${booking.type}, Cost: ${booking.cost}`,
    start: {
      dateTime: `${booking.date}T${booking.time.replace(/\s*([AP]M)/, '')}:00`,
      timeZone: 'UTC',
    },
    end: {
      dateTime: `${booking.date}T${endTime.replace(/\s*([AP]M)/, '')}:00`,
      timeZone: 'UTC',
    },
    attendees: [{ email: booking.email }],
    conferenceData: {
      createRequest: {
        requestId: `meet-${booking.id || Date.now()}`,
        conferenceSolutionKey: { type: 'hangoutsMeet' },
      },
    },
  };
  try {
    const response = await calendar.events.insert({
      calendarId: process.env.GOOGLE_CALENDAR_ID,
      resource: event,
      conferenceDataVersion: 1,
      sendUpdates: 'all', // send notifications to attendees
    });
    const meetLink = response.data.conferenceData?.entryPoints?.find(e => e.entryPointType === 'video')?.uri;
    console.log('Booking added to Google Calendar');
    if (meetLink) {
      console.log('Google Meet link:', meetLink);
      return meetLink;
    }
    return null;
  } catch (err) {
    console.error('Failed to add booking to Google Calendar:', err.message);
    return null;
  }
}

module.exports = { addBookingToGoogleCalendar };
