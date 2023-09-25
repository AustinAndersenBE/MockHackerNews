"use strict";

/******************************************************************************
 * Handling navbar clicks and updating navbar
 */

/** Show main list of all stories when click site name */

function navAllStories(evt) {
  console.debug("navAllStories", evt);
  hidePageComponents();
  $favoritedStories.hide();
  $ownStories.hide();
  
  putStoriesOnPage();
}

$body.on("click", "#nav-all", navAllStories);


function navSubmitStoryClick(evt) {
  console.debug("navSubmitStoryClick", evt);
  hidePageComponents();
  $submitForm.show();
  $allStoriesList.show();
  $favoritedStories.hide();
  $ownStories.hide();
}

$navSubmitStory.on("click", navSubmitStoryClick);


/** Show login/signup on click on "login" */

function navLoginClick(evt) {
  console.debug("navLoginClick", evt);
  hidePageComponents();
  $loginForm.show();
  $signupForm.show();
}

$navLogin.on("click", navLoginClick);

/** When a user first logins in, update the navbar to reflect that. */

function updateNavOnLogin() {
  console.debug("updateNavOnLogin");
  $(".main-nav-links").show();
  $navLogin.hide();
  $navLogOut.show();
  $navUserProfile.text(`${currentUser.username}`).show();
}

function navFavoritesCLick(evt) {
  console.debug("navFavoritesClick", evt)
  hidePageComponents();
  $submitForm.hide();
  $ownStories.hide();
  displayFavoritesList();
}

$navFavorites.on("click", navFavoritesCLick);

function navMyStories(evt) {
  console.debug("navMyStories", evt);
  hidePageComponents();
  putUserStoriesOnPage();
  $favoritedStories.hide();
}

$body.on("click", "#nav-my-stories", navMyStories);