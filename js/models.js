"use strict";

const BASE_URL = "https://hack-or-snooze-v3.herokuapp.com";


class Story {

  /** Make instance of Story from data object about story:
   *   - {title, author, url, username, storyId, createdAt}
   */

  constructor({ storyId, title, author, url, username, createdAt }) {
    this.storyId = storyId;
    this.title = title;
    this.author = author;
    this.url = url;
    this.username = username;
    this.createdAt = createdAt;
  }

  /** Parses hostname out of URL and returns it. */

  getHostName() {
    return new URL(this.url).host;
  }
}


/******************************************************************************
 * List of Story instances: used by UI to show story lists in DOM.
 */

class StoryList {
  constructor(stories) {
    this.stories = stories;
  }

  /** Generate a new StoryList. It:
   *
   *  - calls the API
   *  - builds an array of Story instances
   *  - makes a single StoryList instance out of that
   *  - returns the StoryList instance.
   */

  static async getStories() {
    // Note presence of `static` keyword: this indicates that getStories is
    //  **not** an instance method. Rather, it is a method that is called on the
    //  class directly. Why doesn't it make sense for getStories to be an
    //  instance method?

    // query the /stories endpoint (no auth required)
    const response = await axios({
      url: `${BASE_URL}/stories`,
      method: "GET",
    });

    // turn plain old story objects from API into instances of Story class
    const stories = response.data.stories.map(story => new Story(story));

    // build an instance of our own class using the new array of stories
    return new StoryList(stories);
  }

  /** Adds story data to API, makes a Story instance, adds it to story list.
   * - user - the current instance of User who will post the story
   * - obj of {title, author, url}
   *
   * Returns the new Story instance
   */

  //used in stories.js in showNewStory
  async addStory(user, { title, author, url}) { //takes in user, and an object containing title, author, and url

    const storyData = { //I put the token and story information in an object called storyData
      token: user.loginToken,
      story: {title, author, url}
    };
    
    const response = await axios({ //I call the API and store the response
      method: "POST",
      url: `${BASE_URL}/stories`,
      data: storyData
    });

    const newStory = new Story(response.data.story); // we create a new Story object afterwards
    this.stories.unshift(newStory); //add story to beginning of the stories property
    user.ownStories.unshift(newStory); // also need to add this to the user's ownStories list

    return newStory;
  }

  async removeStory(user, storyId) {
    await axios({
      url: `${BASE_URL}/stories/${storyId}`,
      method: "DELETE",
      data: { token: user.loginToken } //API won't let me just pass in a token directly. I have to wrap the token in an ojbect
    });

    this.stories = this.stories.filter(story => story.storyId !== storyId);  //Filtering out the deleted story (keeping everything that's not equal to the story being deleted)

    user.ownStories = user.ownStories.filter(s => s.storyId !== storyId); //filtering user's story list
    user.favorites = user.favorites.filter(s => s.storyId !== storyId); //filter user's favorite list
  }
}

class User {
  /** Make user instance from obj of user data and a token:
   *   - {username, name, createdAt, favorites[], ownStories[]}
   *   - token
   */

  constructor({
                username,
                name,
                createdAt,
                favorites = [],
                ownStories = []
              },
              token) {
    this.username = username;
    this.name = name;
    this.createdAt = createdAt;

    // instantiate Story instances for the user's favorites and ownStories
    this.favorites = favorites.map(s => new Story(s));
    this.ownStories = ownStories.map(s => new Story(s));

    // store the login token on the user so it's easy to find for API calls.
    this.loginToken = token;
  }

  /** Register new user in API, make User instance & return it.
   *
   * - username: a new username
   * - password: a new password
   * - name: the user's full name
   */

  static async signup(username, password, name) {
    const response = await axios({
      url: `${BASE_URL}/signup`,
      method: "POST",
      data: { user: { username, password, name } },
    });

    let { user } = response.data

    return new User(
      {
        username: user.username,
        name: user.name,
        createdAt: user.createdAt,
        favorites: user.favorites,
        ownStories: user.stories
      },
      response.data.token
    );
  }

  /** Login in user with API, make User instance & return it.

   * - username: an existing user's username
   * - password: an existing user's password
   */

  static async login(username, password) {
    const response = await axios({
      url: `${BASE_URL}/login`,
      method: "POST",
      data: { user: { username, password } },
    });

    let { user } = response.data;

    return new User(
      {
        username: user.username,
        name: user.name,
        createdAt: user.createdAt,
        favorites: user.favorites,
        ownStories: user.stories
      },
      response.data.token
    );
  }

  /** When we already have credentials (token & username) for a user,
   *   we can log them in automatically. This function does that.
   */

  static async loginViaStoredCredentials(token, username) {
    try {
      const response = await axios({
        url: `${BASE_URL}/users/${username}`,
        method: "GET",
        params: { token },
      });

      let { user } = response.data;

      return new User(
        {
          username: user.username,
          name: user.name,
          createdAt: user.createdAt,
          favorites: user.favorites,
          ownStories: user.stories
        },
        token
      );
    } catch (err) {
      console.error("loginViaStoredCredentials failed", err);
      return null;
    }
  }

  //I factored out the updateAPIFavorite method from the addFavorite and removeFavorite methods for modularity
  async updateAPIFavorite(method, story) { //this is a method to update the API with the user's favorite
    try {
      await axios({
        url: `${BASE_URL}/users/${this.username}/favorites/${story.storyId}`, //api url per the documentation
        method: method,
        data: { token: this.loginToken }, // we do this.loginToken because we are in the User class
      });
      return true;
    } catch (error) {
      console.error("Failed to update favorite:", error); //error message here in case the API fails for some reason
      return false;
    }
  }


  async addFavorite(story) { //this is the method in charge of deciding if it's an adding or removing favorite
    if (await this.updateAPIFavorite("POST", story)) { //ensures that local state is in sync with server state
      this.favorites.push(story);
    }
  }

  async removeFavorite(story) {
    if (await this.updateAPIFavorite("DELETE", story)) { //same
      this.favorites = this.favorites.filter(s => s.storyId != story.storyId);
    }
  }

  isFavorite(story) {
    return this.favorites.some(s => (s.storyId === story.storyId));
  }


  isOwnStory(story) {
    return this.ownStories.some(s => (s.storyId === story.storyId));
  }

}
