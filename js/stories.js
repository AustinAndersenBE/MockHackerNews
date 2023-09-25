"use strict";

// This is the global list of the stories, an instance of StoryList
let storyList;

/** Get and show stories when site first loads. */

async function getAndShowStoriesOnStart() {
  storyList = await StoryList.getStories();
  $storiesLoadingMsg.remove();

  putStoriesOnPage();
}

/**
 * A render method to render HTML for an individual Story instance
 * - story: an instance of Story
 *
 * Returns the markup for the story.
 */

function generateStoryMarkup(story, user = null, showTrashBtn = false) { // passing a user state in it allows us to check conditionally generate markup
  console.debug("generateStoryMarkup invoked with:", { story, user, showTrashBtn });
  const hostName = story.getHostName();
  
  let trashCanHTML = "";
  let isFavorite = false;
  let starType = "far";
  let starHTML = "";

  if (user) {
    
    const isOwnStory = user.isOwnStory(story);
    trashCanHTML = showTrashBtn && isOwnStory ? `<span class="trash-can"><i class="fas fa-trash-alt" data-story-id="${story.storyId}"></i></span>` : ""; //adding custom data to the trash button

    
    isFavorite = user.isFavorite(story);
    starType = isFavorite ? "fas" : "far";
    starHTML = `<span class="star"><i class="${starType} fa-star" data-story-id="${story.storyId}"></i></span>`;
  }
 
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
  const story = storyList.stories.find(s => s.storyId === storyId); //just making sure that the server actually has the story we clicked on

  if(!story) {
    console.error("Cannot find story");
    return;
  }

  if (user.isFavorite(story)) {
    await user.removeFavorite(story);
    $star.removeClass('fas').addClass('far');
  } else {
    await user.addFavorite(story);
    $star.removeClass('far').addClass('fas');
  }
}

/** Gets list of stories from server, generates their HTML, and puts on page. */

function putStoriesOnPage() {
  console.debug("putStoriesOnPage");

  $allStoriesList.empty();

  // loop through all of our stories and generate HTML for them
  for (let story of storyList.stories) {
    const $story = generateStoryMarkup(story, currentUser); //it will pass the currentUser to the generateStoryMarkup
    $allStoriesList.append($story);
  }

  $allStoriesList.show();
}

async function showNewStory(evt) {
  console.debug("showNewStory");
  evt.preventDefault();

  const title = $("#title-form").val();
  const url = $("#url-form").val();
  const author = $("#author-form").val();
  const storyData = {title, url, author}; //project solution has username but you don't actually need username

  const story = await storyList.addStory(currentUser, storyData); //api call, adding story to the server
  const $story = generateStoryMarkup(story, currentUser); //generating the HTML
  $allStoriesList.prepend($story);

  $submitForm.fadeOut("slow");
  $submitForm.trigger("reset");
}

$submitForm.on("submit", showNewStory);

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

async function makeStarClickable(evt){
    await toggleFavorite(evt, currentUser);
  }

$('body').on('click', '.fa-star', makeStarClickable);


async function deleteStory(evt) {
  console.debug('deleteStory');
  const $trash = $(evt.target);
    const storyId = $trash.data('story-id'); //using custom Data so we do not have to traverse the DOM


    await storyList.removeStory(currentUser, storyId);
    putUserStoriesOnPage();
}
  

$('body').on('click', '.trash-can', deleteStory);



function putUserStoriesOnPage() {
  console.debug("putUserStoriesOnPage");

  const NO_STORIES_MESSAGE = "<h5>No stories added by user yet!</h5>";
  $ownStories.empty();

  const hasStories = currentUser.ownStories.length > 0;

  const storiesHtml = hasStories
    ? currentUser.ownStories.map(story => generateStoryMarkup(story, currentUser, true).prop('outerHTML')).join("")
    : NO_STORIES_MESSAGE;

    $ownStories.append(storiesHtml);
    $ownStories.show();
}