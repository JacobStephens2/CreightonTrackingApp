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
