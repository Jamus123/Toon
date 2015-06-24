   (function() {

       function getHashParams() {
           var hashParams = {};
           var e, r = /([^&;=]+)=?([^&;]*)/g,
               q = window.location.hash.substring(1);
           while (e = r.exec(q)) {
               hashParams[e[1]] = decodeURIComponent(e[2]);
           }
           return hashParams;
       }

       var params = getHashParams();
       curr_token = params.access_token;
       var access_token = curr_token,
           refresh_token = params.refresh_token,
           error = params.error;


       if (error) {
           alert('There was an error during the authentication');
       } else {
           if (access_token) {


               //load users data into the profile
               $.ajax({
                   url: 'https://api.spotify.com/v1/me',
                   headers: {
                       'Authorization': 'Bearer ' + access_token
                   },
                   success: function(response) {

                       user_id = response.id;

                       $('#login').hide();
                       $('#loggedin').show();
                   }
               });
           } else {
               // render initial screen
               $('#login').show();
               $('#loggedin').hide();
           }
       }

       function get_user(){
       		$.ajax({
       			url:'/change_user',
       			success: function(response){
       					
       			}
       		})
       }
       get_user();

       $('.popover-markup>.trigger').popover({
           html: true,
           title: function() {
               return $(this).parent().find('.head').html();
           },
           content: function() {
               return $(this).parent().find('.content').html();
           }
       });
   })();
