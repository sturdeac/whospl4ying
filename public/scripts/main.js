/**
 * @fileoverview
 * Provides interactions for all pages in the UI.
 *
 * @author  Andrew Sturdevant
 */

/** namespace. */
var wp = wp || {};

/** globals */


//-----------------------LOGIN PAGE-----------------------------------------------------------------------------------------------------


//-----------------------HOME PAGE-----------------------------------------------------------------------------------------------------


//--------------------------------Functions-----------------------------------------------------


rh.initializePage = function () {
  if ($("#list-page").length) {
    console.log("On the list page");
  }
  else if ($("#login-page").length) {
    console.log("On login page");
  }
}

//-------------------------------- Main --------------------------------------------------------

$(document).ready(() => {
  console.log("Ready");
});
