/**
 * @fileoverview
 * Provides interactions for all pages in the UI.
 *
 * @author  Andrew Sturdevant
 */

/** namespace. */
var wp = wp || {};

/** globals */
wp.COLLECTION_USERS = "Users";
wp.USER_NAME = "name";
wp.USER_ONLINE = "is_online";
wp.USER_GAME_TITLE = "game_title";
wp.USER_GAME_PLATFORM = "game_platform";
wp.USER_GAME_SCREENSHOT = "game_screenshot";
wp.USER_FRIENDS = "friends";
wp.USER_FRIEND_REQUESTS = "friend_requests";
wp.USER_GAMER_TAG = "gamer_tag"

wp.User = class {
  constructor(name, is_online, game_title, game_screenshot, game_platform, friends, friend_requests, gamer_tag) {
    this.name = name;
    this.is_online = is_online;
    this.game_title = game_title;
    this.game_platform = game_platform;
    this.game_screenshot = game_screenshot;
    this.friends = friends;
    this.friend_requests = friend_requests;
    this.gamer_tag = gamer_tag
  }
}

//-----------------------HOME PAGE-----------------------------------------------------

wp.FbUsersManager = class {
  constructor() {
    this._ref = firebase.firestore().collection(wp.COLLECTION_USERS);
    this._documentSnapshots = [];
    this._unsubscribe = null;
    this._uid = wp.fbAuthManager.uid;
  }

  beginListening(changeListener) {
    console.log("Listening for movie quotes");
    this._ref.doc(this._uid).get().then((docref) => {
      if(!docref.exists){
        this.add()
      }
    });

    let query = this._ref
      .where(wp.USER_ONLINE, "==", true);

    this._unsubscribe = query
      .onSnapshot(querySnapshot => {
        this._documentSnapshots = querySnapshot.docs;
        if (changeListener) {
          changeListener();
        }
      });
  }

  stopListening() {
    this._unsubscribe();
  }

  add(){
    this._ref
      .doc(this._uid)
      .set({
        [wp.USER_NAME]: wp.fbAuthManager.name,
        [wp.USER_ONLINE]: false,
        [wp.USER_GAME_TITLE]: "",
        [wp.USER_GAME_PLATFORM]: "",
        [wp.USER_GAME_SCREENSHOT]: "",
        [wp.USER_FRIENDS]: [],
        [wp.USER_FRIEND_REQUESTS]: [],
        [wp.USER_GAMER_TAG]: ""
      })
      .then(docRef => {
        console.log("User has been added");
      })
      .catch(error => {
        console.log("There was an error adding the document", error);
      });
  }

  get length() {
    return this._documentSnapshots.length;
  }

  getUserAtIndex(i){
    return new wp.User(
      this._documentSnapshots[i].get(wp.USER_NAME),
      this._documentSnapshots[i].get(wp.USER_ONLINE),
      this._documentSnapshots[i].get(wp.USER_GAME_TITLE),
      this._documentSnapshots[i].get(wp.USER_GAME_SCREENSHOT),
      this._documentSnapshots[i].get(wp.USER_GAME_PLATFORM),
      this._documentSnapshots[i].get(wp.USER_FRIENDS),
      this._documentSnapshots[i].get(wp.USER_FRIEND_REQUESTS),
      this._documentSnapshots[i].get(wp.USER_GAMER_TAG)
    );
    
  }
}

wp.HomePageController = class {
  constructor() {
    wp.fbUsersManger.beginListening(this.updateView.bind(this));

    $("#menuSignOut").click(() => {
      wp.fbAuthManager.signOut();
    });
  }

  updateView(){
    $("#online-list")
      .removeAttr("id")
      .hide();
    let $newList = $(`<div></div>`)
      .attr("id","online-list")
      .addClass("row");

    console.log(wp.fbUsersManger.length)

    for(let k = 0; k < wp.fbUsersManger.length; k++){
      const $newcard = this.createGameCard(wp.fbUsersManger.getUserAtIndex(k));
      $newList.append($newcard);
      $('#home-page').append($newList);
    }
  }

  createGameCard(user){
    let platformIcon = ""
    switch(user.game_platform){
      case 'playstation': 
        platformIcon = "playstation";
        break;
      case 'xbox':
        platformIcon = "xbox";
        break;
      case 'pc':
        platformIcon = "desktop"
        break;
      default:
        platformIcon = "gamepad"
        break;
    }

    const $newcard = $(`
      <div class="col-md-4">
        <div class="card mb-4 shadow-sm">
          <img class="screen-shot" src="${user.game_screenshot}">
          <div class="card-body">
            <h5 class="card-title">${user.game_title}</h5>
            <p class="card-text m-0">${user.name}</p>
            <p class="card-text m-0"><i class="fab fa-${platformIcon}"></i>${user.gamer_tag}</p>
          </div>
        </div>
      </div>
    `)

    return $newcard;
  }
}

//-----------------------auth mngr-----------------------------------------------------
wp.FbAuthManager = class {
  constructor() {
    this._user = null;
  }

  get uid() {
    if (this._user) {
      return this._user.uid;
    }
    console.log("No User");
  }

  get isSignedIn() {
    return !!this._user;
  }

  get name(){
    if(this._user){
      return this._user.displayName;
    }
  }

  beginListening(changeListener) {
    firebase.auth().onAuthStateChanged((user) => {
      this._user = user;
      changeListener();
    });
  }

  signOut() {
    firebase.auth().signOut();
  }
}


//-----------------------Functions-----------------------------------------------------


wp.redirect = function () {
  if ($("#login-page").length && wp.fbAuthManager.isSignedIn) {
    window.location.href = "/home.html";
  } else if (!$("#login-page").length && !wp.fbAuthManager.isSignedIn) {
    window.location.href = "/";
  }
}

wp.initializePage = function () {
  if ($("#home-page").length) {
    console.log("On the list page");
    wp.fbUsersManger = new wp.FbUsersManager();
    new wp.HomePageController();
  }
  else if ($("#login-page").length) {
    console.log("On login page");
    wp.startFirebaseUi();
  } else if ($("#profile-page").length) {
    console.log("On login page");
  }
}

wp.startFirebaseUi = function () {
  // FirebaseUI config.
  var uiConfig = {
    signInSuccessUrl: '/',
    signInOptions: [
      firebase.auth.GoogleAuthProvider.PROVIDER_ID,
      firebase.auth.EmailAuthProvider.PROVIDER_ID
    ],
  };
  var ui = new firebaseui.auth.AuthUI(firebase.auth());
  ui.start("#firebaseui-auth-container", uiConfig);
}

//-------------------------------- Main --------------------------------------------------------

$(document).ready(() => {
  console.log("Ready");
  wp.fbAuthManager = new wp.FbAuthManager();
  wp.fbAuthManager.beginListening(() => {
    wp.redirect();
    wp.initializePage();
  });
});
