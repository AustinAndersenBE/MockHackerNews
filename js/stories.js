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

//this function is responsible for generating the HTML markup for a given story. Depending on the context, it will conditionally adjust the markups to include a trash can icon or a star icon

// default value of user is null which implies that we assume there's no user logged in
// showTrashBtn = false determines if a trash can icon should be displayed. Trash can icon isn't shown unless explicity stated
function generateStoryMarkup(story, user = null, showTrashBtn = false) { // passing a user state in it allows us to conditionally generate markup
  console.debug("generateStoryMarkup invoked with:", { story, user, showTrashBtn });
  const hostName = story.getHostName(); 
  //initializing default variables because we assume the normal state is the user is not logged in
  let trashCanHTML = "";
  let isFavorite = false;
  let starType = "far";
  let starHTML = "";

  if (user) { //if a user is logged in
    
    const isOwnStory = user.isOwnStory(story); //we check if the story belongs to the user
    trashCanHTML = showTrashBtn && isOwnStory ? `<span class="trash-can"><i class="fas fa-trash-alt" data-story-id="${story.storyId}"></i></span>` : ""; 
    // we add the custom data-story-id attribute to associate each icon with a story. Event handlers can easily identify which story is being clicked on without needing to traverse the DOM
    
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
        <a href="${story.url}" target="_blank" class="story-link">
          ${story.title}
        </a>
        <small class="story-hostname">(${hostName})</small>
        <div class ="story-author">by ${story.author}</div>
        <div class="story-user">posted by ${story.username}</div>
      </li>
    `);
    return $storyMarkup;
}

//this function is responsible for toggling the star icon when we click on it
async function toggleFavorite(event, user) {
  
  const $star = $(event.target); //we are selecting the star icon that was clicked on
  const storyId = $star.data('story-id'); //by using our custom data, it is more efficient in lookup speed because we don't have to traverse through the DOM
  const story = storyList.stories.find(s => s.storyId === storyId); //finds the corresponding story object in storyList.stories

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





// This function handles the event triggered when a user submits a new story using the form.
// Fetches story details from the from and sends them to the API to create a new story, then updates the local state with the new story
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




// otherwise, we generate the HTML for every story in the favorites list

function displayFavoritesList() { //this function is used in nav.js, navFavoritesClick function to display the favorites list
  console.debug("displayFavoritesList");

  $favoritedStories.empty(); //empty out the html everytime

  const favoritesList = currentUser.favorites;

  const listHTML = favoritesList.length === 0 //if there are no favorites, we display a message, otherwise we generate the HTML for every story in the favorites list
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
    putUserStoriesOnPage(); // this function is called to update the UI with list of stories
}

$('body').on('click', '.trash-can', deleteStory);



function putUserStoriesOnPage() { //function for putting user's stories on the webpage
  console.debug("putUserStoriesOnPage");

  const NO_STORIES_MESSAGE = "<h5>No stories added by user yet!</h5>";  //default message
  $ownStories.empty(); //clear out the html everytime

  const hasStories = currentUser.ownStories.length > 0;

  const storiesHtml = hasStories //if we have stories, we will go through our own stories list and generate the html for every one
    // if we have stories, we loop through each one and generate HTML for it
    ? currentUser.ownStories.map(story => generateStoryMarkup(story, currentUser, true).prop('outerHTML')).join("")  //.prop converts the jQuery object to HTML string
    : NO_STORIES_MESSAGE;

    $ownStories.append(storiesHtml); //we append the html to my-stories list
    $ownStories.show(); //we show the list
}