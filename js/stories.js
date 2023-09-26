"use strict";

// This is the global list of the stories, an instance of StoryList
let storyList;

/** Get and show stories when site first loads. */

async function getAndShowStoriesOnStart() {
  storyList = await StoryList.getStories(); //wait for StoryList to return a list of stories
  $storiesLoadingMsg.remove(); // we remove the loading message once StoryList returns a list of stories

  putStoriesOnPage(); //we display the list of stories on the page
}

/**
 * A render method to render HTML for an individual Story instance
 * - story: an instance of Story
 *
 * Returns the markup for the story.
 */

//function takes a story and generates the story list that we see
function generateStoryMarkup(story, user = null, showTrashBtn = false) { // passing a user state in it allows us to check conditionally generate markup
  console.debug("generateStoryMarkup invoked with:", { story, user, showTrashBtn });
  const hostName = story.getHostName(); 
  //initializing default variables because we assume the normal state is the user is not logged in
  let trashCanHTML = "";
  let isFavorite = false;
  let starType = "far";
  let starHTML = "";

  if (user) { //if a user is logged in
    
    const isOwnStory = user.isOwnStory(story); //we check if the story belongs to the user
    trashCanHTML = showTrashBtn && isOwnStory ? `<span class="trash-can"><i class="fas fa-trash-alt" data-story-id="${story.storyId}"></i></span>` : ""; //adding custom data to the trash button
    // if we want this to show the trash button and if it's a user's own story, we create the trashcan icon html
    
    isFavorite = user.isFavorite(story); // we set star type based on if it's already a favorited story by the user
    starType = isFavorite ? "fas" : "far";
    starHTML = `<span class="star"><i class="${starType} fa-star" data-story-id="${story.storyId}"></i></span>`;
    //adding custom data to our star because we want to associated it with the story
  }
 

  // this creates the HTML (list of stories that you see) on the webpage
  const $storyMarkup = $(` 
      <li id="${story.storyId}">
        ${trashCanHTML}
        ${starHTML}
        <a href="${story.url}" target="a_blank" class="story-link">
          ${story.title}
        </a>
        <small class="story-hostname">(${hostName})</small>
        <div class ="story-author">by ${story.author}</div>
        <div class="story-user">posted by ${story.username}</div>
      </li>
    `);
    return $storyMarkup;
}

async function toggleFavorite(event, user) {
  
  const $star = $(event.target);
  const storyId = $star.data('story-id'); //by using our custom data, it is more efficient in lookup speed because we don't have to traverse through the DOM
  const story = storyList.stories.find(s => s.storyId === storyId); //give me the first story where the storyId associated w/ the star matches the storyId in the storyList

  if(!story) { //just making sure that we actually have the story we clicked on stored in there
    console.error("Cannot find story");
    return;
  }

  if (user.isFavorite(story)) { //if the story selected is a favorite, we remove it
    await user.removeFavorite(story);
    $star.removeClass('fas').addClass('far');
  } else { //if the story selected is not a favorite, we add it to the favorite
    await user.addFavorite(story);
    $star.removeClass('far').addClass('fas');
  }
}

async function makeStarClickable(evt){ // we toggle the Star everytime we click on it
  await toggleFavorite(evt, currentUser);
}

$('body').on('click', '.fa-star', makeStarClickable);

/** Gets list of stories from server, generates their HTML, and puts on page. */

function putStoriesOnPage() { //function is in charge of putting the stories on the page
  console.debug("putStoriesOnPage");

  $allStoriesList.empty(); //we clear out any existing html to re-do the html everytime from our list of stories

  // loop through all of our stories and generate HTML for them
  for (let story of storyList.stories) {
    const $story = generateStoryMarkup(story, currentUser); //it will pass the currentUser to the generateStoryMarkup
    $allStoriesList.append($story);
  }

  $allStoriesList.show();
}


// this function is an async function that handles the event when a user submits a new story



// once we generate that one new story, we add it to the beginning of the list of all stories which updates the UI
async function showNewStory(evt) {
  console.debug("showNewStory");
  evt.preventDefault(); //prevents page from reloading

  const title = $("#title-form").val(); // we gather the user's input for the story's title, URL and author from the form fields,  and we put them in storyData
  const url = $("#url-form").val();
  const author = $("#author-form").val();
  const storyData = {title, url, author}; //store info in a storyData object

  const story = await storyList.addStory(currentUser, storyData); // use the addStory method from the storyList global object and pass in current user and the storyData
  const $story = generateStoryMarkup(story, currentUser); //generating the HTML
  $allStoriesList.prepend($story); // add the HTML to the beginning of the allStoriesList HTML which updates the new story to our screen

  $submitForm.fadeOut("slow"); // animation for the form to slowly go away
  $submitForm.trigger("reset"); //reset contents of the form
}

$submitForm.on("submit", showNewStory); //attaching the event to the submit button

// this is a function that shows the Favorites List
// first we clear out any existing HTML so we can start fresh
// if there's nothing in favorites, show no favorites added
// otherwise, we generate the HTML for every story in the favorites list

function displayFavoritesList() {
  console.debug("displayFavoritesList");

  $favoritedStories.empty();

  const favoritesList = currentUser.favorites;

  const listHTML = favoritesList.length === 0 
    ? "<h5>No favorites Added!</h5>" 
    : favoritesList.map(story => generateStoryMarkup(story, currentUser).prop('outerHTML')).join(""); //.prop converts the jQuery object to HTML string

  $favoritedStories.append(listHTML);
  $favoritedStories.show();
}


async function deleteStory(evt) { //function responsible for deleting story
  console.debug('deleteStory');
  const $trash = $(evt.target); //$trash variable is the trash can icon
    const storyId = $trash.data('story-id'); //using custom Data so we do not have to traverse the DOM


    await storyList.removeStory(currentUser, storyId); //this method removes the story from the storyList and the user's ownStories list
    putUserStoriesOnPage();
}

$('body').on('click', '.trash-can', deleteStory);



function putUserStoriesOnPage() { //function for putting stories on the webpage
  console.debug("putUserStoriesOnPage");

  const NO_STORIES_MESSAGE = "<h5>No stories added by user yet!</h5>";  //default message
  $ownStories.empty(); //clear out the html everytime

  const hasStories = currentUser.ownStories.length > 0;

  const storiesHtml = hasStories //if we have stories, we will go through our own stories list and generate the html for every one
    ? currentUser.ownStories.map(story => generateStoryMarkup(story, currentUser, true).prop('outerHTML')).join("")
    : NO_STORIES_MESSAGE;

    $ownStories.append(storiesHtml);
    $ownStories.show();
}