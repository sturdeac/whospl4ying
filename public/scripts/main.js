/**
 * @fileoverview
 * Provides interactions for all pages in the UI.
 *
 * @author  David Fisher
 */

/** namespace. */
var rh = rh || {};

/** globals */
rh.COLLECTION_MOVIEQUOTES = "MovieQuotes";
rh.KEY_QUOTE = "quote";
rh.KEY_MOVIE = "movie";
rh.KEY_LAST_TOUCHED = "lastTouched";
rh.KEY_UID = "uid";

rh.ROSE_FIRE_TOKEN = "fbf58d9e-79f0-4624-8de9-2e4a53596d60";

rh.fbMovieQuotesManager = null;
rh.fbSingleMovieQuoteManager = null;
rh.fbAuthManager = null;

rh.MovieQuote = class {
  constructor(id, quote, movie) {
    this.id = id;
    this.quote = quote;
    this.movie = movie;
  }
};

//-----------------------LOGIN PAGE-----------------------------------------------------------------------------------------------------
rh.FbAuthManager = class {
  constructor() {
    this._user = null;
    // this.uid = null;
    // this.isSignedIn = false;
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

  beginListening(changeListener) {
    firebase.auth().onAuthStateChanged((user) => {
      this._user = user;
      changeListener();
    });
  }

  signIn() {
    console.log("Rosefire Sign In");

    Rosefire.signIn(rh.ROSE_FIRE_TOKEN, (err, rfUser) => {
      if (err) {
        // User not logged in!
        console.log("Rosefire Error:", err)
        return;
      }

      console.log("Rosefire login worked", rfUser);

      firebase.auth().signInWithCustomToken(rfUser.token).then((authData) => {
        // User logged in successfully 
        console.log("Firebase auth worked", authData);
      }, (error) => {
        // User not logged in!
        console.log("Firebase auth error:", error);
      });
    });

  }

  signOut() {
    firebase.auth().signOut();
  }
}

rh.LoginPageController = class {
  constructor() {
    $("#rosefireBtn").click((e) => {
      rh.fbAuthManager.signIn();
    })
  }
}

//-----------------------HOME PAGE-----------------------------------------------------------------------------------------------------

rh.FbMovieQuotesManager = class {
  constructor(urlUid) {
    this._ref = firebase.firestore().collection(rh.COLLECTION_MOVIEQUOTES);
    this._documentSnapshots = [];
    this._unsubscribe = null;
    this._uid = urlUid;
  }

  beginListening(changeListener) {
    console.log("Listening for movie quotes");
    let query = this._ref
      .orderBy(rh.KEY_LAST_TOUCHED, "desc")
      .limit(30);

    if(this._uid) {
      query = query.where(rh.KEY_UID, "==", this._uid);
    }

    this._unsubscribe = query
      .onSnapshot(querySnapshot => {
        this._documentSnapshots = querySnapshot.docs;
        console.log(
          "Update " + this._documentSnapshots.length + " movie quotes"
        );
        if (changeListener) {
          changeListener();
        }
      });
  }

  stopListening() {
    this._unsubscribe();
  }

  add(quote, movie) {
    this._ref
      .add({
        [rh.KEY_QUOTE]: quote,
        [rh.KEY_MOVIE]: movie,
        [rh.KEY_LAST_TOUCHED]: firebase.firestore.Timestamp.now(),
        [rh.KEY_UID]: rh.fbAuthManager.uid
      })
      .then(docRef => {
        console.log("Document has been added with id", docRef.id);
      })
      .catch(error => {
        console.log("There was an error adding the document", error);
      });
  }

  get length() {
    return this._documentSnapshots.length;
  }
  getMovieQuoteAtIndex(index) {
    return new rh.MovieQuote(
      this._documentSnapshots[index].id,
      this._documentSnapshots[index].get(rh.KEY_QUOTE),
      this._documentSnapshots[index].get(rh.KEY_MOVIE)
    );
  }
};

rh.ListPageController = class {
  constructor() {
    rh.fbMovieQuotesManager.beginListening(this.updateView.bind(this));
    $("#addQuoteDialog").on("shown.bs.modal", function (e) {
      $("#inputQuote").trigger("focus");
    });
    $("#submitAddQuote").click(event => {
      const quote = $("#inputQuote").val();
      const movie = $("#inputMovie").val();
      rh.fbMovieQuotesManager.add(quote, movie);
      $("#inputQuote").val("");
      $("#inputMovie").val("");
    });

    $("#myQuotesBtn").click(() => {
      window.location.href = `/list.html?uid=${rh.fbAuthManager.uid}`;
    });
    $("#allQuotesBtn").click(() => {
      window.location.href = "/list.html";
    });
    $("#signOutBtn").click(() => {
      rh.fbAuthManager.signOut();
    });
  }

  updateView() {
    $("#quoteList")
      .removeAttr("id")
      .hide();
    let $newList = $("<ul></ul>")
      .attr("id", "quoteList")
      .addClass("list-group");

    for (let k = 0; k < rh.fbMovieQuotesManager.length; k++) {
      const $newCard = this.createQuoteCard(
        rh.fbMovieQuotesManager.getMovieQuoteAtIndex(k)
      );
      $newList.append($newCard);
    }
    $("#quoteListContainer").append($newList);
  }

  createQuoteCard(movieQuote) {
    const $newCard = $(`
		  <li id="${movieQuote.id}" class="quote-card list-group-item">
		     <div class="quote-card-quote">${movieQuote.quote}</div>
		     <div class="quote-card-movie text-right blockquote-footer">${movieQuote.movie}</div>
	      </li>`);

    $newCard.click(() => {
      console.log("You have clicked", movieQuote);
      window.location.href = `/moviequote.html?id=${movieQuote.id}`;
    });
    return $newCard;
  }
};

//-------------------------DETAIL PAGE ----------------------------------------------------------------------------------------------

rh.FbSingleMovieQuoteManager = class {
  constructor(id) {
    this._ref = firebase
      .firestore()
      .collection(rh.COLLECTION_MOVIEQUOTES)
      .doc(id);
    this._document = {};
    this._unsubscribe = null;
  }

  beginListening(changeListener) {
    console.log("Listening for specific movie quote.");
    this._unsubscribe = this._ref.onSnapshot(doc => {
      if (doc.exists) {
        this._document = doc;
        console.log("doc.data() :", doc.data());
        if (changeListener) {
          changeListener();
        }
      }
    });
  }

  stopListening() {
    this._unsubscribe();
  }

  update(quote, movie) {
    this._ref.update({
      [rh.KEY_QUOTE]: quote,
      [rh.KEY_MOVIE]: movie,
      [rh.KEY_LAST_TOUCHED]: firebase.firestore.Timestamp.now()
    });
  }

  delete() {
    return this._ref.delete();
  }

  get movie() {
    return this._document.get(rh.KEY_MOVIE);
  }

  get quote() {
    return this._document.get(rh.KEY_QUOTE);
  }

  get uid() {
    return this._document.get(rh.KEY_UID);
  }
};

rh.DetailPageController = class {
  constructor() {
    rh.fbSingleMovieQuoteManager.beginListening(this.updateView.bind(this));
    $("#editQuoteDialog").on("show.bs.modal", function (e) {
      $("#inputQuote").trigger("focus");
      $("#inputQuote").val(rh.fbSingleMovieQuoteManager.quote);
      $("#inputMovie").val(rh.fbSingleMovieQuoteManager.movie);
    });
    $("#editQuoteDialog").on("shown.bs.modal", function (e) {
      $("#inputQuote").trigger("focus");
    });
    $("#submitEditQuote").click((e) => {
      const quote = $("#inputQuote").val();
      const movie = $("#inputMovie").val();
      rh.fbSingleMovieQuoteManager.update(quote, movie);
    });
    $("#submitDeleteQuote").click((e) => {
      rh.fbSingleMovieQuoteManager.delete().then(() => {
        window.location.href = '/list.html';
      });
    });

    $("#signOutBtn").click(() => {
      rh.fbAuthManager.signOut();
    });
  }

  updateView() {
    const quote = rh.fbSingleMovieQuoteManager.quote;
    const movie = rh.fbSingleMovieQuoteManager.movie;
    const uid = rh.fbSingleMovieQuoteManager.uid;

    $("#cardQuote").html(quote);
    $("#cardMovie").html(movie);
    
    if(uid == rh.fbAuthManager.uid) {
      $('#editBtn').show();
      $('#deleteBtn').show();
    }
  }
};


//--------------------------------Functions-----------------------------------------------------

rh.checkForRedirects = function () {
  if ($("#login-page").length && rh.fbAuthManager.isSignedIn) {
    window.location.href = "/list.html";
  } else if (!$("#login-page").length && !rh.fbAuthManager.isSignedIn) {
    window.location.href = "/";
  }
}

rh.initializePage = function () {
  if ($("#list-page").length) {
    console.log("On the list page");
    const urlParams = new URLSearchParams(window.location.search);
    urlUid = urlParams.get("uid");
    rh.fbMovieQuotesManager = new rh.FbMovieQuotesManager(urlUid);
    new rh.ListPageController();
  }
  else if ($("#detail-page").length) {
    console.log("On detail page");
    const urlParams = new URLSearchParams(window.location.search);
    movieQuoteId = urlParams.get("id");
    if (movieQuoteId) {
      rh.fbSingleMovieQuoteManager = new rh.FbSingleMovieQuoteManager(movieQuoteId);
      new rh.DetailPageController();
    } else {
      console.log("Missing movie quote ID");
      window.location.href = "/list.html";
    }
  }
  else if ($("#login-page").length) {
    console.log("On login page");
    new rh.LoginPageController();
  }
}

//-------------------------------- Main --------------------------------------------------------

$(document).ready(() => {
  console.log("Ready");
  rh.fbAuthManager = new rh.FbAuthManager();
  rh.fbAuthManager.beginListening(() => {
    console.log(`todo: handle auth state changes. isSignedIn = ${rh.fbAuthManager.isSignedIn}`);
    rh.checkForRedirects();
    rh.initializePage();
  });
});
