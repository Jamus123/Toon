This is an application for my Final Project while attending LearningFuze web development school.

This project, all technologies and all features used within were decided by me and were of my own vision.

The app is called Toon and is a local music sharing application that is powered by the Spotify music streaming service and Google Maps. Users create profiles that are an abstraction of their Spotify profile, relying on the playlists that the user creates. These playlists are broadcasted over websockets on the server in rder to allow users to connect to "nodes" on the google map to view other users playlists in their area.

The program uses Node.js and express for the server and any http requests. MySQL is used for the database in order to store user profile information. The program uses the Spotify web API in order to retrieve relevent user and artist information. Use of the API is limited, as making requests to it are generally slow and and can become blocked if too many are made. The program remedies this by grabbing all neccessary resources from the API and stores them on the client side.

The front-end uses js, jquery, ajax and some bootstrap for styling.

*A spotify account is required to use this program*

*Program is still very much in development*
