"use strict";

class Workout {
  date = new Date();
  id = (Date.now() + "").slice(-10);
  clicks = 0;

  constructor(coords, distance, duration) {
    this.coords = coords;
    this.distance = distance; //in min
    this.duration = duration; //in min
  }

  _setDescription() {
    // prettier-ignore
    const months = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];

    this.description = `${this.type[0].toUpperCase()}${this.type.slice(1)} on ${
      months[this.date.getMonth()]
    } ${this.date.getDate()}`;
  }
  // click() {
  //   ++this.clicks;
  // }
}

class Running extends Workout {
  type = "running";
  constructor(coords, distance, duration, cadence) {
    super(coords, distance, duration);
    this.cadence = cadence;
    this.calcPace();
    this._setDescription();
  }

  calcPace() {
    //min/km
    this.pace = this.duration / this.distance;
    return this.pace;
  }
}

class Cycling extends Workout {
  type = "cycling";
  constructor(coords, distance, duration, elevationGain) {
    super(coords, distance, duration);
    this.elevationGain = elevationGain;
    this.calcSpeed();
    this._setDescription();
  }

  calcSpeed() {
    //min/km
    this.speed = this.distance / (this.duration / 60);
    return this.speed;
  }
}

const form = document.querySelector(".form");
const containerWorkouts = document.querySelector(".workouts");
const inputType = document.querySelector(".form__input--type");
const inputDistance = document.querySelector(".form__input--distance");
const inputDuration = document.querySelector(".form__input--duration");
const inputCadence = document.querySelector(".form__input--cadence");
const inputElevation = document.querySelector(".form__input--elevation");
const deleteAllBtn = document.querySelector(".delete-all-btn");
const editBtn = document.querySelector(".sort-by-distance");
const showAllWorkoutsBtn = document.querySelector(".show-all-workouts");

class App {
  #map;
  #mapEvent;
  #workouts = [];
  #mapZoomLevel = 13;
  counter = 1;
  #marker;
  #markers = [];

  constructor() {
    ///Get users position
    this._getPosition();

    //get data from local storage
    this._getLocalStorage();

    form.addEventListener("submit", this._newWorkOut.bind(this));
    inputType.addEventListener("change", this._toggleElevationField);
    containerWorkouts.addEventListener("click", this._moveToPopup.bind(this));
    containerWorkouts.addEventListener("click", this.deleteWorkout.bind(this));
    containerWorkouts.addEventListener("click", this.editWorkout.bind(this));
    deleteAllBtn.addEventListener("click", this.deleteAll);
    editBtn.addEventListener("click", this.sortByDistance.bind(this));
    showAllWorkoutsBtn.addEventListener(
      "click",
      this.showAllWorkouts.bind(this)
    );
  }

  _getPosition() {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        this._loadMap.bind(this),
        function () {
          alert("could not get ur position");
        }
      );
    }
  }

  _loadMap(position) {
    const { latitude } = position.coords;
    const { longitude } = position.coords;

    const coords = [latitude, longitude];

    this.#map = L.map("map").setView(coords, this.#mapZoomLevel);

    L.tileLayer("https://{s}.tile.openstreetmap.fr/hot/{z}/{x}/{y}.png", {
      attribution:
        '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
    }).addTo(this.#map);

    this.#map.on("click", this._showForm.bind(this));

    this.#workouts.forEach((work) => {
      this._rnderWorkoutMarker(work);
    });
  }

  _showForm(mapE) {
    this.#mapEvent = mapE;
    form.classList.remove("hidden");
    inputDistance.focus();
  }

  _hideForm() {
    //empty imputs
    inputDistance.value =
      inputDuration.value =
      inputCadence.value =
      inputElevation.value =
        0;

    form.style.display = "none";
    form.classList.add("hidden");
    setTimeout(() => (form.style.display = "grid"), 1000);
  }

  _toggleElevationField() {
    inputElevation.closest(".form__row").classList.toggle("form__row--hidden");
    inputCadence.closest(".form__row").classList.toggle("form__row--hidden");
  }

  _newWorkOut(e) {
    e.preventDefault();

    const validInputs = (...inputs) =>
      inputs.every((inp) => Number.isFinite(inp));
    const allPositive = (...inputs) => inputs.every((inp) => inp > 0);

    //get data from form
    const type = inputType.value;
    const distance = +inputDistance.value;
    const duration = +inputDuration.value;
    const { lat, lng } = this.#mapEvent.latlng;
    let workout;

    //check if valid

    //if running,create running obj
    if (type === "running") {
      const cadence = +inputCadence.value;
      //check for valid data
      if (
        // !Number.isFinite(distance) ||
        // !Number.isFinite(duration) ||
        // !Number.isFinite(cadence)
        !validInputs(distance, duration, cadence) ||
        !allPositive(distance, duration, cadence)
      )
        return alert("inputs gotta be positive");

      workout = new Running([lat, lng], distance, duration, cadence);
    }

    //if cycling => cycling obj
    if (type === "cycling") {
      const elevation = +inputElevation.value;
      if (
        !validInputs(distance, duration, elevation) ||
        !allPositive(distance, duration)
      )
        return alert("inputs gotta be positive");
      workout = new Cycling([lat, lng], distance, duration, elevation);
    }

    //add new obj to workout array
    this.#workouts.push(workout);

    //render wotkout on list
    this._renderWorkout(workout);

    //render workout on map as marker
    this._rnderWorkoutMarker(workout);

    //hide form
    this._hideForm();

    //set localstorage
    this._setLocalStorage();
  }
  _rnderWorkoutMarker(workout) {
    this.#marker = L.marker(workout.coords)
      .addTo(this.#map)
      .bindPopup(
        L.popup({
          maxWidth: 250,
          minWidth: 100,
          autoClose: false,
          closeOnClick: false,
          className: `${workout.type}-popup`,
        })
      )
      .setPopupContent(
        `${workout.type === "running" ? "🏃‍♂️" : "🚴‍♀️"} ${workout.description}`
      )
      .openPopup();
    this.#markers.push(this.#marker);
    console.log(this.#markers);
  }
  _renderWorkout(workout) {
    let html = `
    <li class="workout workout--${workout.type}" data-id="${workout.id}">
      <h2 class="workout__title">${workout.description}</h2>
      <button class="delete-workout" data-id="${workout.id}">Delete</button>
      <button class="edit-workout" data-id="${workout.id}">Edit</button>
      <div class="workout__details">
        <span class="workout__icon">${
          workout.type === "running" ? "🏃‍♂️" : "🚴‍♀️"
        }</span>
        <span class="workout__value">${workout.distance}</span>
        <span class="workout__unit">km</span>
      </div>
      <div class="workout__details">
        <span class="workout__icon">⏱</span>
        <span class="workout__value">${workout.duration}</span>
        <span class="workout__unit">min</span>
      </div>`;
    if (workout.type === "running") {
      html += `
         <div class="workout__details">
          <span class="workout__icon">⚡️</span>
          <span class="workout__value">${workout.pace.toFixed(1)}</span>
          <span class="workout__unit">min/km</span>
        </div>
        <div class="workout__details">
          <span class="workout__icon">🦶🏼</span>
          <span class="workout__value">${workout.cadence}</span>
          <span class="workout__unit">spm</span>
        </div>
      </li>
      `;
    }
    if (workout.type === "cycling") {
      html += `
      <div class="workout__details">
      <span class="workout__icon">⚡️</span>
      <span class="workout__value">${workout.speed.toFixed(1)}</span>
      <span class="workout__unit">km/h</span>
    </div>
    <div class="workout__details">
      <span class="workout__icon">⛰</span>
      <span class="workout__value">${workout.elevationGain}</span>
      <span class="workout__unit">m</span>
    </div>
  </li>
      `;
    }
    form.insertAdjacentHTML("afterend", html);
  }
  _moveToPopup(e) {
    const workoutEl = e.target.closest(".workout");
    if (!workoutEl) return;
    const workout = this.#workouts.find(
      (work) => work.id === workoutEl.dataset.id
    );

    this.#map.setView(workout.coords, this.#mapZoomLevel, {
      animate: true,
      pan: {
        duration: 1,
      },
    });
    // workout.click();
  }

  _setLocalStorage() {
    localStorage.setItem("workouts", JSON.stringify(this.#workouts));
  }

  _getLocalStorage() {
    if (!localStorage.getItem("workouts")) return;
    const data = JSON.parse(localStorage.getItem("workouts"));
    let dataArr = [];
    data.forEach((workout) => {
      if (workout.type === "running") {
        const cadence = +inputCadence.value;
        workout = new Running(
          [...workout.coords],
          workout.distance,
          workout.duration,
          workout.cadence
        );
      }
      if (workout.type === "cycling") {
        const elevation = +inputElevation.value;
        workout = new Cycling(
          [...workout.coords],
          workout.distance,
          workout.duration,
          workout.elevation
        );
      }
      dataArr.push(workout);
    });

    if (!dataArr) return;

    this.#workouts = dataArr;

    this.#workouts.forEach((work) => {
      this._renderWorkout(work);
    });
  }

  reset() {
    localStorage.removeItem("workouts");
    location.reload();
  }

  _refillLocalstorage(workout) {
    localStorage.removeItem("workouts");
    localStorage.setItem("workouts", JSON.stringify(workout));
  }
  editWorkout(e) {
    const editWorkout = e.target.closest(".edit-workout");
    if (!editWorkout) return;
    const workout = this.#workouts.find(
      (workout) => workout.id === editWorkout.dataset.id
    );
    workout.type = prompt("insert type");
    workout.distance = Number(prompt("insert distance"));
    workout.duration = Number(prompt("insert duration"));
    if (workout.type === "running")
      workout.cadence = Number(prompt("insert cadance"));
    if (workout.type === "cycling")
      workout.elevation = Number(prompt("insert elevation"));
    this._renderWorkout(workout);
    this._refillLocalstorage(this.#workouts);
  }
  deleteWorkout(e) {
    const deleteWorkoutBtn = e.target.closest(".delete-workout");
    e.target.closest(".workout").remove();
    if (!deleteWorkoutBtn) return;
    let workout = this.#workouts.find(
      (work) => work.id === deleteWorkoutBtn.dataset.id
    );
    this.#workouts.splice(this.#workouts.indexOf(workout), 1);
    this._refillLocalstorage(this.#workouts);
  }
  deleteAll() {
    const allworkout = document.querySelectorAll(".workout");
    allworkout.forEach((workout) => workout.remove());
    localStorage.removeItem("workouts");
  }
  sortByDistance() {
    if (this.counter % 2 === 1) {
      editBtn.style.backgroundColor = "#ffb545";
      const workoutsArr = [...this.#workouts];
      workoutsArr.sort((a, b) => b.distance - a.distance);
      const allworkout = document.querySelectorAll(".workout");
      allworkout.forEach((workout) => workout.remove());
      workoutsArr.forEach((work) => {
        this._renderWorkout(work);
      });
    } else if (this.counter % 2 === 0) {
      editBtn.style.backgroundColor = "#00c46a";
      const allworkout = document.querySelectorAll(".workout");
      allworkout.forEach((workout) => workout.remove());
      this.#workouts.forEach((work) => {
        this._renderWorkout(work);
      });
    }
    this.counter++;
  }
  showAllWorkouts() {
    let group = new L.featureGroup([...this.#markers]);

    this.#map.fitBounds(group.getBounds().pad(0.5));
  }
}

const app = new App();
