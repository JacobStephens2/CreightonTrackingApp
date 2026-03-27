# Overview
There should be a PWA app which can be wrapped in a such a way that allows delivery by the Google Play Store and run on Android. This app should allow someone to track their cycle via the Creighton Model of Natural Family Planning.

# Domain
The app should be accessible at https://creighton.stephens.page

# Analytics
## Web App
The site should collect Google Analytics with this tag:

<!-- Google tag (gtag.js) -->
<script async src="https://www.googletagmanager.com/gtag/js?id=G-4RXK6BKTKW"></script>
<script>
  window.dataLayer = window.dataLayer || [];
  function gtag(){dataLayer.push(arguments);}
  gtag('js', new Date());

  gtag('config', 'G-4RXK6BKTKW');
</script>

# Login and Data Storage on Server
The user should be able to login if they want in order to store their tracking data on the server rather than on their device. This will let them access the data across devices.

When a user creates an account, any data they have stored locally should be uploaded to their account.

The user's account should include their first name.

# Sharing with your provider
There should be a feature that lets you share your charts with your provider. The provider should then get access to a read only view of the user's charts.

There should be a link in the shared chart view to the main site.

The shared chart view should show the name of the person whose chart you are viewing.

# Clicking the Basic Infertile Pattern for a pop up explanation
The user should be able to click the Basic Infertile Pattern icon in the legend to show an element which explains to them what it is.

# Link to Creighton's Website
There should be links to https://www.fertilitycare.org/ and https://saintpaulvi.com/ for more information.

# New Observations
When a user is inputting a new observation, they should be able to choose a date for the observation. The default date should be today.

# Sample Chart
The initial app view should have a sample chart to show people what to expect, indicating to them that this is a sample chart, and after they enter their first observation the sample chart no longer displays.
