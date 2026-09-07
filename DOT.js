/* =========================================================
   FIREBASE
========================================================= */

import { auth, db } from "./firebase-config.js";

import { onAuthStateChanged, signInWithEmailAndPassword, signOut, setPersistence, browserLocalPersistence } from "https://www.gstatic.com/firebasejs/12.18.0/firebase-auth.js";
import { collection, collectionGroup, doc, setDoc, updateDoc, deleteDoc, onSnapshot, serverTimestamp } from "https://www.gstatic.com/firebasejs/12.18.0/firebase-firestore.js";


import {
  createClient
} from "https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2/+esm";


const SUPABASE_URL =
  "https://fbprgvkzujzzvczatbfe.supabase.co";


const SUPABASE_ANON_KEY =
  "sb_publishable_wdawZ1_UZYtZhJzQAavI0g_J3dOg9ym";


const SUPABASE_BUCKET =
  "travelbuddy-destinations";


const supabase =
  createClient(
    SUPABASE_URL,
    SUPABASE_ANON_KEY
  );



const ACTIVITY = [

  {
    text: "You published <b>Ulot River Torpedo Extreme Ride</b>.",
    time: "Aug 15, 2026",
    ico: "circle-plus",
    color: "#079fa3",
    bg: "#d8f6f7"
  },

  {
    text: "A traveler left a 5-star rating on <b>San Juanico Bridge</b>.",
    time: "Aug 12, 2026",
    ico: "star",
    color: "#a67200",
    bg: "#fff4d9"
  }

];


/* =========================================================
   STATE
========================================================= */

let destinations = [];
let editingId = null;
let adminComments = [];
let adminRatings = [];
let adminSavedPlaces = [];
let adminRealtimeNotifications = [];
const ADMIN_NOTIFICATION_READ_KEY = "travelBuddyDotReadNotifications";
let adminSavedPlacesUnsubscribe = null;
let adminCommentsUnsubscribe = null;
let adminRatingsUnsubscribe = null;
let mainPhotoDataUrl = null;
let mainPhotoFile = null;
let supportingPhotos = [];
let uploadedDocs = [];
let destStatusFilter = "All";
let destSearchTerm = "";
let categoryFilter = "All";
let pendingDeleteId = null;
let pendingUnpublishId = null;

/* =========================================================
   REALTIME SAVED PLACES LISTENER
========================================================= */

function startRealtimeAdminSavedPlacesListener() {

  /* =========================================
     STOP OLD LISTENER
  ========================================= */

  if (
    adminSavedPlacesUnsubscribe
  ) {

    adminSavedPlacesUnsubscribe();

    adminSavedPlacesUnsubscribe =
      null;

  }


  /* =========================================
     LISTEN TO EVERY USER'S savedPlaces
  ========================================= */

  adminSavedPlacesUnsubscribe =
    onSnapshot(

      collectionGroup(
        db,
        "savedPlaces"
      ),

      snapshot => {

        adminSavedPlaces =
          snapshot.docs.map(
            documentSnapshot => ({

              id:
                documentSnapshot.id,

              ...documentSnapshot.data()

            })
          );


        console.log(
          "Realtime Saved Places:",
          adminSavedPlaces
        );

        renderStats();

        renderRecentDest();

        renderDestList();

        refreshRealtimeAdminNotifications();

      },

      error => {

        console.error(
          "ADMIN SAVED PLACES ERROR:",
          error
        );

      }

    );

}

/* =========================================================
   COUNT SAVES FOR ONE DESTINATION
========================================================= */

function getRealtimeDestinationSaveCount(
  destinationId
) {

  if (
    !destinationId
  ) {

    return 0;

  }


  return adminSavedPlaces.filter(
    savedPlace => {

      const savedDestinationId =
        savedPlace.destinationId
        ||
        savedPlace.id;


      return savedDestinationId ===
        destinationId;

    }
  ).length;

}

/* =========================================================
   HELPERS
========================================================= */

function refreshIcons() {

  if (
    window.lucide
  ) {

    window.lucide.createIcons();

  }

}


function showToast(
  message
) {

  const toast =
    document.getElementById(
      "toast"
    );


  document.getElementById(
    "toastText"
  ).textContent =
    message;


  toast.classList.add(
    "show"
  );


  clearTimeout(
    showToast._timer
  );


  showToast._timer =
    setTimeout(
      () => {

        toast.classList.remove(
          "show"
        );

      },
      3000
    );

}


function todayLabel() {

  return new Date()
    .toLocaleDateString(
      "en-US",
      {
        month: "short",
        day: "numeric",
        year: "numeric"
      }
    );

}


function cleanFileName(
  name
) {

  return name.replace(
    /[^a-zA-Z0-9._-]/g,
    "-"
  );

}

/* =========================================================
   SAFE HTML
========================================================= */

function escapeAdminHTML(
  value
) {

  return String(
    value ?? ""
  )
    .replaceAll(
      "&",
      "&amp;"
    )
    .replaceAll(
      "<",
      "&lt;"
    )
    .replaceAll(
      ">",
      "&gt;"
    )
    .replaceAll(
      '"',
      "&quot;"
    )
    .replaceAll(
      "'",
      "&#039;"
    );

}


/* =========================================================
   COMMENT TIMESTAMP
========================================================= */

function getAdminCommentTime(
  comment
) {

  if (
    comment.createdAt
    &&
    typeof comment.createdAt.toMillis ===
    "function"
  ) {

    return comment.createdAt.toMillis();

  }


  if (
    Number.isFinite(
      Number(
        comment.clientCreatedAt
      )
    )
  ) {

    return Number(
      comment.clientCreatedAt
    );

  }


  return 0;

}


/* =========================================================
   FRIENDLY COMMENT DATE
========================================================= */

function formatAdminCommentTime(
  comment
) {

  const timestamp =
    getAdminCommentTime(
      comment
    );


  if (
    !timestamp
  ) {

    return "Recently";

  }


  const difference =
    Date.now() -
    timestamp;


  const seconds =
    Math.max(
      0,
      Math.floor(
        difference /
        1000
      )
    );


  if (
    seconds <
    60
  ) {

    return "Just now";

  }


  const minutes =
    Math.floor(
      seconds /
      60
    );


  if (
    minutes <
    60
  ) {

    return `${minutes}m ago`;

  }


  const hours =
    Math.floor(
      minutes /
      60
    );


  if (
    hours <
    24
  ) {

    return `${hours}h ago`;

  }


  const days =
    Math.floor(
      hours /
      24
    );


  if (
    days <
    7
  ) {

    return `${days}d ago`;

  }


  return new Date(
    timestamp
  )
    .toLocaleDateString(
      "en-US",
      {
        month:
          "short",

        day:
          "numeric",

        year:
          "numeric"
      }
    );

}


/* =========================================================
   GET DESTINATION NAME
========================================================= */

function getAdminDestinationName(
  destinationId
) {

  const destination =
    destinations.find(
      item =>
        item.id ===
        destinationId
    );


  return destination?.name
    ||
    "Unknown destination";

}


/* =========================================================
   GET USER RATING FOR THAT EXACT DESTINATION
========================================================= */

function getAdminUserDestinationRating(
  userId,
  destinationId
) {

  if (
    !userId
    ||
    !destinationId
  ) {

    return 0;

  }


  const ratingRecord =
    adminRatings.find(
      rating =>

        rating.userId ===
        userId

        &&

        rating.destinationId ===
        destinationId
    );


  return Number(
    ratingRecord?.rating
    ||
    0
  );

}


/* =========================================================
   USER INITIALS
========================================================= */

function getAdminCommentInitials(
  name
) {

  return String(
    name ||
    "Traveler"
  )
    .trim()
    .split(
      /\s+/
    )
    .filter(
      Boolean
    )
    .slice(
      0,
      2
    )
    .map(
      part =>
        part.charAt(
          0
        )
          .toUpperCase()
    )
    .join(
      ""
    )
    ||
    "T";

}


/* =========================================================
   SUPABASE STORAGE UPLOAD
========================================================= */

async function uploadFile(
  file,
  path
) {

  if (
    !file
  ) {

    throw new Error(
      "No file selected."
    );

  }


  const {
    data,
    error
  } =
    await supabase
      .storage
      .from(
        SUPABASE_BUCKET
      )
      .upload(
        path,
        file,
        {
          cacheControl:
            "3600",

          upsert:
            false,

          contentType:
            file.type
        }
      );


  if (
    error
  ) {

    console.error(
      "SUPABASE UPLOAD ERROR:",
      error
    );


    throw new Error(
      error.message
      ||
      "Unable to upload file."
    );

  }


  const {
    data: publicData
  } =
    supabase
      .storage
      .from(
        SUPABASE_BUCKET
      )
      .getPublicUrl(
        data.path
      );


  if (
    !publicData?.publicUrl
  ) {

    throw new Error(
      "Unable to create public photo URL."
    );

  }


  return publicData.publicUrl;

}

/* =========================================================
   FIRESTORE REALTIME LISTENER
========================================================= */

function startRealtimeDestinationListener() {

  onSnapshot(

    collection(
      db,
      "destinations"
    ),

    snapshot => {

      destinations =
        snapshot.docs.map(
          item => ({

            id:
              item.id,

            ...item.data()

          })
        );


      renderAll();

      renderDestList();

      refreshRealtimeAdminNotifications();


      console.log(
        "Realtime destinations:",
        destinations
      );

    },

    error => {

      console.error(
        "FIRESTORE ERROR:",
        error
      );


      showToast(
        "Unable to load destinations from Firebase."
      );

    }

  );

}


/* =========================================================
   VIEW SWITCHING
========================================================= */

const topbarMeta = {

  dashboard: {
    title: "Dashboard",
    sub: "Here's what's happening with your destinations today."
  },

  destinations: {
    title: "Manage Destinations",
    sub: "Edit, publish, or archive your listings."
  },

  form: {
    title: "Add New Destination",
    sub: "Fill in the details below — you can publish immediately or save as a draft."
  },

  reviews: {
    title: "Comments & Ratings",
    sub: "See what travelers are saying about your destinations."
  },

  account: {
    title: "Account Settings",
    sub: "Manage your DOT Admin profile."
  }

};


function switchView(
  view
) {

  document
    .querySelectorAll(
      ".admin-view"
    )
    .forEach(
      element => {

        element.classList.remove(
          "active"
        );

      }
    );


  document
    .getElementById(
      "view-" + view
    )
    ?.classList.add(
      "active"
    );


  document
    .querySelectorAll(
      ".sidebar-link[data-view]"
    )
    .forEach(
      link => {

        link.classList.toggle(

          "active",

          link.getAttribute(
            "data-view"
          ) === view

        );

      }
    );


  const meta =
    topbarMeta[view]
    ||
    topbarMeta.dashboard;


  document.getElementById(
    "topbarTitle"
  ).textContent =
    meta.title;


  document.getElementById(
    "topbarSubtitle"
  ).textContent =
    meta.sub;


  closeSidebarMobile();

  window.scrollTo(
    0,
    0
  );

}


/* =========================================================
   NAVIGATION
========================================================= */

document
  .querySelectorAll(
    "[data-view]"
  )
  .forEach(
    element => {

      element.addEventListener(
        "click",
        () => {

          const view =
            element.getAttribute(
              "data-view"
            );


          if (
            view === "form"
            &&
            (
              element.id ===
              "sidebarAddNew"
              ||
              element.classList.contains(
                "quick-action-card"
              )
            )
          ) {

            openForm(
              null
            );

            return;

          }


          switchView(
            view
          );

        }
      );

    }
  );


document
  .getElementById(
    "topbarAddBtn"
  )
  ?.addEventListener(
    "click",
    () => {

      openForm(
        null
      );

    }
  );


/* =========================================================
   MOBILE SIDEBAR
========================================================= */

function openSidebarMobile() {

  document
    .getElementById(
      "adminSidebar"
    )
    .classList.add(
      "open"
    );


  document
    .getElementById(
      "sidebarOverlay"
    )
    .classList.add(
      "show"
    );

}


function closeSidebarMobile() {

  document
    .getElementById(
      "adminSidebar"
    )
    .classList.remove(
      "open"
    );


  document
    .getElementById(
      "sidebarOverlay"
    )
    .classList.remove(
      "show"
    );

}


document
  .getElementById(
    "hamburgerBtn"
  )
  ?.addEventListener(
    "click",
    openSidebarMobile
  );


document
  .getElementById(
    "sidebarOverlay"
  )
  ?.addEventListener(
    "click",
    closeSidebarMobile
  );


/* =========================================================
   REALTIME DOT ADMIN NOTIFICATIONS
========================================================= */


/* =========================================================
   TIMESTAMP -> MILLISECONDS
========================================================= */

function adminTimestampToMillis(
  value
) {

  if (
    !value
  ) {

    return 0;

  }


  if (
    typeof value.toMillis ===
    "function"
  ) {

    return value.toMillis();

  }


  if (
    typeof value.toDate ===
    "function"
  ) {

    return value
      .toDate()
      .getTime();

  }


  const numberValue =
    Number(
      value
    );


  return Number.isFinite(
    numberValue
  )
    ?
    numberValue
    :
    0;

}


/* =========================================================
   FRIENDLY NOTIFICATION TIME
========================================================= */

function formatAdminNotificationTime(
  timestamp
) {

  const time =
    Number(
      timestamp
    );


  if (
    !time
  ) {

    return "Recently";

  }


  const difference =
    Math.max(
      0,
      Date.now() -
      time
    );


  const seconds =
    Math.floor(
      difference /
      1000
    );


  if (
    seconds <
    60
  ) {

    return "Just now";

  }


  const minutes =
    Math.floor(
      seconds /
      60
    );


  if (
    minutes <
    60
  ) {

    return `${minutes}m ago`;

  }


  const hours =
    Math.floor(
      minutes /
      60
    );


  if (
    hours <
    24
  ) {

    return `${hours}h ago`;

  }


  const days =
    Math.floor(
      hours /
      24
    );


  if (
    days <
    7
  ) {

    return `${days}d ago`;

  }


  return new Date(
    time
  )
    .toLocaleDateString(
      "en-US",
      {
        month:
          "short",

        day:
          "numeric",

        year:
          "numeric"
      }
    );

}


/* =========================================================
   READ NOTIFICATION STORAGE
========================================================= */

function getAdminNotificationReadKey() {

  const userId =
    auth.currentUser?.uid
    ||
    "unknown";


  return `${ADMIN_NOTIFICATION_READ_KEY}_${userId}`;

}


function getAdminReadNotifications() {

  try {

    const stored =
      JSON.parse(

        localStorage.getItem(
          getAdminNotificationReadKey()
        )

        ||
        "[]"

      );


    return new Set(
      Array.isArray(
        stored
      )
        ?
        stored
        :
        []
    );


  } catch (
  error
  ) {

    console.error(
      "ADMIN NOTIFICATION READ ERROR:",
      error
    );


    return new Set();

  }

}


function saveAdminReadNotifications(
  readSet
) {

  localStorage.setItem(

    getAdminNotificationReadKey(),

    JSON.stringify(
      Array.from(
        readSet
      )
    )

  );

}


/* =========================================================
   SAVE MILESTONE

   1 save
   5 saves
   10, 20, 30, 40, 50...
   100, 150, 200...
   1000, 1500...
========================================================= */

function getSaveMilestone(
  count
) {

  const total =
    Number(
      count
    )
    ||
    0;


  if (
    total <=
    0
  ) {

    return 0;

  }


  if (
    total <
    5
  ) {

    return 1;

  }


  if (
    total <
    10
  ) {

    return 5;

  }


  if (
    total <
    100
  ) {

    return Math.floor(
      total /
      10
    ) *
      10;

  }


  if (
    total <
    1000
  ) {

    return Math.floor(
      total /
      50
    ) *
      50;

  }


  return Math.floor(
    total /
    500
  ) *
    500;

}


/* =========================================================
   BUILD SAVE NOTIFICATIONS
========================================================= */

function buildSaveMilestoneNotifications() {

  const notifications =
    [];


  destinations.forEach(
    destination => {

      const matchingSaves =
        adminSavedPlaces.filter(
          savedPlace => {

            const destinationId =
              savedPlace.destinationId
              ||
              savedPlace.id;


            return destinationId ===
              destination.id;

          }
        );


      const saveCount =
        matchingSaves.length;


      const milestone =
        getSaveMilestone(
          saveCount
        );


      if (
        !milestone
      ) {

        return;

      }


      /*
         Find the most recent save so the
         milestone has a useful timestamp.
      */

      let latestSaveTime =
        0;


      matchingSaves.forEach(
        savedPlace => {

          const time =
            adminTimestampToMillis(
              savedPlace.savedAt
            );


          if (
            time >
            latestSaveTime
          ) {

            latestSaveTime =
              time;

          }

        }
      );


      const safeName =
        escapeAdminHTML(
          destination.name
          ||
          "Destination"
        );


      let text;


      if (
        milestone ===
        1
      ) {

        text =
          `<b>${safeName}</b> received its first save.`;

      } else {

        text =
          `<b>${safeName}</b> reached ${milestone.toLocaleString()} saves.`;

      }


      notifications.push({

        id:
          `save_${destination.id}_${milestone}`,

        type:
          "save",

        destinationId:
          destination.id,

        text:
          text,

        timestamp:
          latestSaveTime,

        targetView:
          "destinations"

      });

    }
  );


  return notifications;

}


/* =========================================================
   BUILD ALL REALTIME NOTIFICATIONS
========================================================= */

function buildRealtimeAdminNotifications() {

  const notifications =
    [];


  /*
     Don't fill the panel with extremely old activity.
     Normal comments / ratings / uploads are shown
     for the latest 30 days.
  */

  const recentLimit =
    Date.now() -
    (
      30 *
      24 *
      60 *
      60 *
      1000
    );


  /* =====================================================
     NEW / UPLOADED DESTINATIONS
  ===================================================== */

  destinations.forEach(
    destination => {

      const timestamp =
        adminTimestampToMillis(
          destination.createdAt
        );


      if (
        !timestamp
        ||
        timestamp <
        recentLimit
      ) {

        return;

      }


      const safeName =
        escapeAdminHTML(
          destination.name
          ||
          "Destination"
        );


      const status =
        destination.status ===
          "Published"

          ?

          "published"

          :

          "uploaded";


      notifications.push({

        id:
          `destination_${destination.id}`,

        type:
          "destination",

        destinationId:
          destination.id,

        text:
          `You ${status} <b>${safeName}</b>.`,

        timestamp:
          timestamp,

        targetView:
          "destinations"

      });

    }
  );


  /* =====================================================
     COMMENTS
  ===================================================== */

  adminComments.forEach(
    comment => {

      const timestamp =
        adminTimestampToMillis(
          comment.createdAt
        )
        ||
        Number(
          comment.clientCreatedAt
        )
        ||
        0;


      if (
        !timestamp
        ||
        timestamp <
        recentLimit
      ) {

        return;

      }


      const destinationName =
        escapeAdminHTML(
          getAdminDestinationName(
            comment.destinationId
          )
        );


      const travelerName =
        escapeAdminHTML(
          comment.userName
          ||
          "A traveler"
        );


      notifications.push({

        id:
          `comment_${comment.id}`,

        type:
          "comment",

        destinationId:
          comment.destinationId,

        text:
          `<b>${travelerName}</b> commented on <b>${destinationName}</b>.`,

        timestamp:
          timestamp,

        targetView:
          "reviews"

      });

    }
  );


  /* =====================================================
     RATINGS
  ===================================================== */

  adminRatings.forEach(
    rating => {

      const timestamp =
        adminTimestampToMillis(
          rating.updatedAt
        );


      if (
        !timestamp
        ||
        timestamp <
        recentLimit
      ) {

        return;

      }


      const destinationName =
        escapeAdminHTML(
          getAdminDestinationName(
            rating.destinationId
          )
        );


      const travelerName =
        escapeAdminHTML(
          rating.userName
          ||
          "A traveler"
        );


      const ratingValue =
        Math.max(
          1,
          Math.min(
            5,
            Number(
              rating.rating
            )
            ||
            0
          )
        );


      /*
         Timestamp is included in the ID.

         If the same traveler changes their rating
         later, DOT receives a new unread notification.
      */

      notifications.push({

        id:
          `rating_${rating.id}_${timestamp}`,

        type:
          "rating",

        destinationId:
          rating.destinationId,

        text:
          `<b>${travelerName}</b> rated <b>${destinationName}</b> ${ratingValue} star${ratingValue === 1 ? "" : "s"}.`,

        timestamp:
          timestamp,

        targetView:
          "reviews"

      });

    }
  );


  /* =====================================================
     SAVE MILESTONES
  ===================================================== */

  notifications.push(
    ...buildSaveMilestoneNotifications()
  );


  /* =====================================================
     NEWEST FIRST
  ===================================================== */

  return notifications
    .filter(
      notification =>
        notification.timestamp >
        0
    )
    .sort(
      (
        first,
        second
      ) =>
        second.timestamp -
        first.timestamp
    )
    .slice(
      0,
      40
    );

}


/* =========================================================
   REFRESH REALTIME NOTIFICATIONS
========================================================= */

function refreshRealtimeAdminNotifications() {

  const readNotifications =
    getAdminReadNotifications();


  adminRealtimeNotifications =
    buildRealtimeAdminNotifications()
      .map(
        notification => ({

          ...notification,

          unread:
            !readNotifications.has(
              notification.id
            )

        })
      );


  renderNotifPanel();

}


/* =========================================================
   NOTIFICATION ICON
========================================================= */

function getAdminNotificationIcon(
  type
) {

  switch (
  type
  ) {

    case "destination":
      return "map-pin-plus";

    case "comment":
      return "message-circle";

    case "rating":
      return "star";

    case "save":
      return "heart";

    default:
      return "bell";

  }

}


/* =========================================================
   RENDER PANEL
========================================================= */

function renderNotifPanel() {

  const panelList =
    document.getElementById(
      "notifPanelList"
    );


  const countBadge =
    document.getElementById(
      "adminNotifCount"
    );


  if (
    !panelList
  ) {

    return;

  }


  const unreadCount =
    adminRealtimeNotifications.filter(
      notification =>
        notification.unread
    ).length;


  if (
    countBadge
  ) {

    countBadge.textContent =
      unreadCount >
        99

        ?

        "99+"

        :

        String(
          unreadCount
        );


    countBadge.style.display =
      unreadCount >
        0

        ?

        "grid"

        :

        "none";

  }


  /* =====================================================
     EMPTY
  ===================================================== */

  if (
    adminRealtimeNotifications.length ===
    0
  ) {

    panelList.innerHTML = `

      <div class="admin-notification-empty">

        <i data-lucide="bell"></i>

        <strong>
          No notifications yet
        </strong>

        <span>
          New activity will appear here automatically.
        </span>

      </div>

    `;


    refreshIcons();

    return;

  }


  panelList.innerHTML =

    adminRealtimeNotifications
      .map(
        notification => `

          <button
            type="button"
            class="
              notif-panel-item
              ${notification.unread ? "unread" : ""}
            "
            data-admin-notification-id="${escapeAdminHTML(notification.id)}"
            data-admin-notification-target="${escapeAdminHTML(notification.targetView)}"
            data-admin-notification-destination="${escapeAdminHTML(notification.destinationId || "")}"
          >

            <span
              class="
                admin-notification-icon
                ${notification.type}
              "
            >

              <i
                data-lucide="${getAdminNotificationIcon(notification.type)}"
              ></i>

            </span>


            <div class="admin-notification-copy">

              <p>
                ${notification.text}
              </p>


              <div class="time">

                ${formatAdminNotificationTime(
          notification.timestamp
        )}

              </div>

            </div>


            ${notification.unread

            ?

            `
                  <span
                    class="admin-notification-unread-dot"
                  ></span>
                `

            :

            ""
          }

          </button>

        `
      )
      .join(
        ""
      );


  refreshIcons();

}


/* =========================================================
   MARK ONE READ
========================================================= */

function markAdminNotificationRead(
  notificationId
) {

  if (
    !notificationId
  ) {

    return;

  }


  const readNotifications =
    getAdminReadNotifications();


  readNotifications.add(
    notificationId
  );


  saveAdminReadNotifications(
    readNotifications
  );


  refreshRealtimeAdminNotifications();

}


/* =========================================================
   MARK ALL READ
========================================================= */

function markAllAdminNotificationsRead() {

  const readNotifications =
    getAdminReadNotifications();


  adminRealtimeNotifications.forEach(
    notification => {

      readNotifications.add(
        notification.id
      );

    }
  );


  saveAdminReadNotifications(
    readNotifications
  );


  refreshRealtimeAdminNotifications();

}


/* =========================================================
   BELL BUTTON
========================================================= */

document
  .getElementById(
    "notifBtn"
  )
  ?.addEventListener(
    "click",
    event => {

      event.stopPropagation();


      document
        .getElementById(
          "notifPanel"
        )
        ?.classList
        .toggle(
          "show"
        );

    }
  );


/* =========================================================
   MARK ALL READ BUTTON
========================================================= */

document
  .getElementById(
    "markAllReadBtn"
  )
  ?.addEventListener(
    "click",
    event => {

      event.stopPropagation();


      markAllAdminNotificationsRead();

    }
  );


/* =========================================================
   CLICK A NOTIFICATION
========================================================= */

document
  .getElementById(
    "notifPanelList"
  )
  ?.addEventListener(
    "click",
    event => {

      const notificationItem =
        event.target.closest(
          "[data-admin-notification-id]"
        );


      if (
        !notificationItem
      ) {

        return;

      }


      const notificationId =
        notificationItem.dataset
          .adminNotificationId;


      const targetView =
        notificationItem.dataset
          .adminNotificationTarget;


      const destinationId =
        notificationItem.dataset
          .adminNotificationDestination;


      markAdminNotificationRead(
        notificationId
      );


      document
        .getElementById(
          "notifPanel"
        )
        ?.classList
        .remove(
          "show"
        );


      /* =========================================
         COMMENT / RATING
      ========================================= */

      if (
        targetView ===
        "reviews"
      ) {

        switchView(
          "reviews"
        );


        return;

      }


      /* =========================================
         DESTINATION / SAVES
      ========================================= */

      switchView(
        "destinations"
      );


      requestAnimationFrame(
        () => {

          const card =
            Array
              .from(
                document.querySelectorAll(
                  ".admin-dest-card"
                )
              )
              .find(
                destinationCard =>
                  destinationCard.dataset.id ===
                  destinationId
              );


          card?.scrollIntoView({
            behavior:
              "smooth",

            block:
              "center"
          });

        }
      );

    }
  );


/* =========================================================
   CLICK OUTSIDE
========================================================= */

document.addEventListener(
  "click",
  event => {

    if (
      !event.target.closest(
        "#notifPanel"
      )
      &&
      !event.target.closest(
        "#notifBtn"
      )
    ) {

      document
        .getElementById(
          "notifPanel"
        )
        ?.classList
        .remove(
          "show"
        );

    }

  }
);


/* =========================================================
   STATS
========================================================= */

function renderStats() {

  const total =
    destinations.length;


  const published =
    destinations.filter(
      destination =>
        destination.status ===
        "Published"
    ).length;


  const drafts =
    destinations.filter(
      destination =>
        destination.status ===
        "Draft"
    ).length;


  /* =====================================================
   ACTUAL REALTIME SAVED PLACES
===================================================== */

  const totalSaves =
    adminSavedPlaces.length;


  const cards = [

    {
      num: total,
      lbl: "Total Destinations",
      ico: "map-pinned",
      color: "#079fa3",
      bg: "#d8f6f7"
    },

    {
      num: published,
      lbl: "Published",
      ico: "globe",
      color: "#079fa3",
      bg: "#d8f6f7"
    },

    {
      num: drafts,
      lbl: "Drafts",
      ico: "file-edit",
      color: "#a67200",
      bg: "#fff4d9"
    },

    {
      num: totalSaves.toLocaleString(),
      lbl: "Total Saves",
      ico: "heart",
      color: "#d33838",
      bg: "#fde8e8"
    }

  ];


  document.getElementById(
    "statGrid"
  ).innerHTML =

    cards
      .map(
        card => `

                    <div class="stat-card">

                        <div class="stat-card-top">

                            <div
                                class="stat-ico"
                                style="background:${card.bg};color:${card.color};"
                            >

                                <i data-lucide="${card.ico}"></i>

                            </div>

                        </div>

                        <div class="stat-num">
                            ${card.num}
                        </div>

                        <div class="stat-lbl">
                            ${card.lbl}
                        </div>

                    </div>

                `
      )
      .join(
        ""
      );


  refreshIcons();

}


/* =========================================================
   DESTINATION CARD
========================================================= */

function statusPill(
  status
) {

  const safeStatus =
    status
    ||
    "Draft";


  return `

        <span class="status-pill ${safeStatus.toLowerCase()}">
            ${safeStatus}
        </span>

    `;

}


function adminDestCard(
  destination
) {

  return `

        <div
            class="admin-dest-card"
            data-id="${destination.id}"
        >

            <div class="admin-dest-thumb">

                <img
                    src="${destination.img || ""}"
                    alt="${destination.name || ""}"
                >

            </div>


            <div class="admin-dest-info">

                <h4>
                    ${destination.name || "Unnamed"}
                </h4>


                <div class="admin-dest-meta">

                    <i data-lucide="map-pin"></i>

                    ${destination.municipality || "—"}

                    ·

                    ${destination.category || "—"}

                    ${statusPill(destination.status)}

                </div>


                <div class="admin-dest-stats">

                    <span>

                        <i data-lucide="eye"></i>

                        ${Number(destination.views || 0).toLocaleString()}

                    </span>

                    <span>

  <i data-lucide="heart"></i>

  ${getRealtimeDestinationSaveCount(
    destination.id
  )
      .toLocaleString()
    }

</span>

                    <span>

                        <i data-lucide="star"></i>

                        ${destination.rating || "—"}

                    </span>

                    <span>

                        <i data-lucide="clock"></i>

                        ${destination.updated || "—"}

                    </span>

                </div>

            </div>


            <div class="admin-dest-actions">

                <button
                    class="icon-action-btn"
                    data-edit="${destination.id}"
                    title="Edit"
                >

                    <i data-lucide="pencil"></i>

                </button>


                ${destination.status ===
      "Published"

      ?

      `

                    <button
                        class="icon-action-btn"
                        data-unpublish="${destination.id}"
                        title="Unpublish"
                    >

                        <i data-lucide="eye-off"></i>

                    </button>

                    `

      :

      `

                    <button
                        class="icon-action-btn"
                        data-publish="${destination.id}"
                        title="Publish"
                    >

                        <i data-lucide="globe"></i>

                    </button>

                    `
    }


                <button
                    class="icon-action-btn danger"
                    data-delete="${destination.id}"
                    title="Delete"
                >

                    <i data-lucide="trash-2"></i>

                </button>

            </div>

        </div>

    `;

}


/* =========================================================
   RECENT DESTINATIONS
========================================================= */

function renderRecentDest() {

  const recent =
    destinations
      .slice(
        0,
        4
      );


  document.getElementById(
    "recentDestList"
  ).innerHTML =

    recent
      .map(
        adminDestCard
      )
      .join(
        ""
      );


  refreshIcons();

  bindDestActionEvents();

}


/* =========================================================
   ACTIVITY
========================================================= */

function renderActivity() {

  document.getElementById(
    "activityList"
  ).innerHTML =

    ACTIVITY
      .map(
        activity => `

                    <div class="activity-item">

                        <div
                            class="activity-ico"
                            style="background:${activity.bg};color:${activity.color};"
                        >

                            <i data-lucide="${activity.ico}"></i>

                        </div>


                        <div class="activity-text">

                            <p>
                                ${activity.text}
                            </p>

                            <div class="time">
                                ${activity.time}
                            </div>

                        </div>

                    </div>

                `
      )
      .join(
        ""
      );


  refreshIcons();

}


/* =========================================================
   DESTINATION LIST
========================================================= */

function renderDestList() {

  const filtered =
    destinations.filter(
      destination => {

        const matchesStatus =
          destStatusFilter ===
          "All"
          ||
          destination.status ===
          destStatusFilter;


        const matchesCategory =
          categoryFilter ===
          "All"
          ||
          destination.category ===
          categoryFilter;


        const name =
          (
            destination.name
            ||
            ""
          ).toLowerCase();


        const municipality =
          (
            destination.municipality
            ||
            ""
          ).toLowerCase();


        const matchesSearch =
          !destSearchTerm
          ||
          name.includes(
            destSearchTerm
          )
          ||
          municipality.includes(
            destSearchTerm
          );


        return (
          matchesStatus
          &&
          matchesCategory
          &&
          matchesSearch
        );

      }
    );


  document.getElementById(
    "destResultCount"
  ).textContent =
    `${filtered.length} destination${filtered.length === 1 ? "" : "s"}`;


  const container =
    document.getElementById(
      "destListContainer"
    );


  if (
    filtered.length ===
    0
  ) {

    container.innerHTML = `

            <div class="empty-state">

                <div class="empty-state-ico">

                    <i data-lucide="map-pinned"></i>

                </div>

                <h3>
                    No destinations found
                </h3>

                <p>
                    Add a destination to get started.
                </p>

                <button
                    class="btn btn-primary"
                    id="emptyAddBtn"
                >

                    <i data-lucide="circle-plus"></i>

                    Add New Destination

                </button>

            </div>

        `;


    refreshIcons();


    document
      .getElementById(
        "emptyAddBtn"
      )
      ?.addEventListener(
        "click",
        () => {

          openForm(
            null
          );

        }
      );


    return;

  }


  container.innerHTML =
    filtered
      .map(
        adminDestCard
      )
      .join(
        ""
      );


  refreshIcons();

  bindDestActionEvents();

}


/* =========================================================
   FILTERS
========================================================= */

document
  .getElementById(
    "destSearchInput"
  )
  ?.addEventListener(
    "input",
    event => {

      destSearchTerm =
        event.target.value
          .toLowerCase();


      renderDestList();

    }
  );


document
  .getElementById(
    "categoryFilterSelect"
  )
  ?.addEventListener(
    "change",
    event => {

      categoryFilter =
        event.target.value;


      renderDestList();

    }
  );


document
  .querySelectorAll(
    "#statusFilterRow .filter-chip"
  )
  .forEach(
    chip => {

      chip.addEventListener(
        "click",
        () => {

          document
            .querySelectorAll(
              "#statusFilterRow .filter-chip"
            )
            .forEach(
              item => {

                item.classList.remove(
                  "active"
                );

              }
            );


          chip.classList.add(
            "active"
          );


          destStatusFilter =
            chip.getAttribute(
              "data-status"
            );


          renderDestList();

        }
      );

    }
  );


document
  .getElementById(
    "topbarSearch"
  )
  ?.addEventListener(
    "input",
    event => {

      destSearchTerm =
        event.target.value
          .toLowerCase();


      switchView(
        "destinations"
      );


      document.getElementById(
        "destSearchInput"
      ).value =
        event.target.value;


      renderDestList();

    }
  );


/* =========================================================
   FIREBASE PUBLISH / EDIT / DELETE
========================================================= */

function bindDestActionEvents() {

  document
    .querySelectorAll(
      "[data-edit]"
    )
    .forEach(
      button => {

        button.addEventListener(
          "click",
          () => {

            openForm(
              button.getAttribute(
                "data-edit"
              )
            );

          }
        );

      }
    );


  document
    .querySelectorAll(
      "[data-delete]"
    )
    .forEach(
      button => {

        button.addEventListener(
          "click",
          () => {

            pendingDeleteId =
              button.getAttribute(
                "data-delete"
              );


            const destination =
              destinations.find(
                item =>
                  item.id ===
                  pendingDeleteId
              );


            document.getElementById(
              "deleteModalText"
            ).textContent =
              `This will permanently remove "${destination?.name || "this destination"}".`;


            document
              .getElementById(
                "deleteModalBackdrop"
              )
              .classList.add(
                "show"
              );

          }
        );

      }
    );


  document
    .querySelectorAll(
      "[data-unpublish]"
    )
    .forEach(
      button => {

        button.addEventListener(
          "click",
          () => {

            pendingUnpublishId =
              button.getAttribute(
                "data-unpublish"
              );


            const destination =
              destinations.find(
                item =>
                  item.id ===
                  pendingUnpublishId
              );


            document.getElementById(
              "unpublishModalTitle"
            ).textContent =
              `Unpublish "${destination?.name}"?`;


            document
              .getElementById(
                "confirmUnpublishBtn"
              )
              .textContent =
              "Unpublish";


            document
              .getElementById(
                "unpublishModalBackdrop"
              )
              .classList.add(
                "show"
              );

          }
        );

      }
    );


  document
    .querySelectorAll(
      "[data-publish]"
    )
    .forEach(
      button => {

        button.addEventListener(
          "click",
          async () => {

            const id =
              button.getAttribute(
                "data-publish"
              );


            try {

              await updateDoc(

                doc(
                  db,
                  "destinations",
                  id
                ),

                {
                  status:
                    "Published",

                  updated:
                    todayLabel(),

                  updatedAt:
                    serverTimestamp()
                }

              );


              showToast(
                "Destination published."
              );

            } catch (
            error
            ) {

              console.error(
                error
              );


              showToast(
                error.message
              );

            }

          }
        );

      }
    );

}


/* =========================================================
   DELETE CONFIRM
========================================================= */

document
  .getElementById(
    "cancelDeleteBtn"
  )
  ?.addEventListener(
    "click",
    () => {

      document
        .getElementById(
          "deleteModalBackdrop"
        )
        .classList.remove(
          "show"
        );


      pendingDeleteId =
        null;

    }
  );


document
  .getElementById(
    "confirmDeleteBtn"
  )
  ?.addEventListener(
    "click",
    async () => {

      if (
        !pendingDeleteId
      ) {

        return;

      }


      try {

        await deleteDoc(

          doc(
            db,
            "destinations",
            pendingDeleteId
          )

        );


        document
          .getElementById(
            "deleteModalBackdrop"
          )
          .classList.remove(
            "show"
          );


        showToast(
          "Destination deleted."
        );


        pendingDeleteId =
          null;


      } catch (
      error
      ) {

        console.error(
          error
        );


        showToast(
          error.message
        );

      }

    }
  );


/* =========================================================
   UNPUBLISH CONFIRM
========================================================= */

document
  .getElementById(
    "cancelUnpublishBtn"
  )
  ?.addEventListener(
    "click",
    () => {

      document
        .getElementById(
          "unpublishModalBackdrop"
        )
        .classList.remove(
          "show"
        );


      pendingUnpublishId =
        null;

    }
  );


document
  .getElementById(
    "confirmUnpublishBtn"
  )
  ?.addEventListener(
    "click",
    async () => {

      if (
        !pendingUnpublishId
      ) {

        return;

      }


      try {

        await updateDoc(

          doc(
            db,
            "destinations",
            pendingUnpublishId
          ),

          {
            status:
              "Draft",

            updated:
              todayLabel(),

            updatedAt:
              serverTimestamp()
          }

        );


        document
          .getElementById(
            "unpublishModalBackdrop"
          )
          .classList.remove(
            "show"
          );


        showToast(
          "Destination unpublished."
        );


        pendingUnpublishId =
          null;


      } catch (
      error
      ) {

        console.error(
          error
        );


        showToast(
          error.message
        );

      }

    }
  );


/* =========================================================
   RESET FORM
========================================================= */

function resetForm() {

  editingId =
    null;


  mainPhotoDataUrl =
    null;


  mainPhotoFile =
    null;


  supportingPhotos =
    [];


  uploadedDocs =
    [];


  [
    "fName",
    "fShortDesc",
    "fFullDesc",
    "fMunicipality",
    "fBarangay",
    "fAddress",
    "fLat",
    "fLng",
    "fRepName",
    "fRepEmail",
    "fRepPhone"
  ]
    .forEach(
      id => {

        document.getElementById(
          id
        ).value =
          "";

      }
    );


  document.getElementById(
    "fCategory"
  ).value =
    "Beaches";


  document.getElementById(
    "d1"
  ).checked =
    false;


  document.getElementById(
    "d2"
  ).checked =
    false;


  document.getElementById(
    "d3"
  ).checked =
    false;


  document.getElementById(
    "mainPhotoInput"
  ).value =
    "";


  document.getElementById(
    "supportingPhotoInput"
  ).value =
    "";


  document.getElementById(
    "docInput"
  ).value =
    "";


  resetAdminMapPicker();


  document
    .getElementById(
      "publishToggle"
    )
    .classList.add(
      "on"
    );


  document.getElementById(
    "publishToggleLabel"
  ).textContent =
    "Publish immediately";


  document.getElementById(
    "saveBtnLabel"
  ).textContent =
    "Publish Destination";


  document.getElementById(
    "deleteDraftBtn"
  ).style.display =
    "none";


  renderMainPhotoArea();

  renderSupportingPhotos();

  renderDocsList();

}


/* =========================================================
   OPEN ADD / EDIT FORM
========================================================= */

function openForm(
  id
) {

  resetForm();


  if (
    id
  ) {

    const destination =
      destinations.find(
        item =>
          item.id === id
      );


    if (
      !destination
    ) {

      return;

    }


    editingId =
      id;


    document.getElementById(
      "formTitle"
    ).textContent =
      "Edit Destination";


    document.getElementById(
      "formSubtitle"
    ).textContent =
      `Editing "${destination.name}"`;


    document.getElementById(
      "fName"
    ).value =
      destination.name
      ||
      "";


    document.getElementById(
      "fCategory"
    ).value =
      destination.category
      ||
      "Beaches";


    document.getElementById(
      "fShortDesc"
    ).value =
      destination.shortDesc
      ||
      "";


    document.getElementById(
      "fFullDesc"
    ).value =
      destination.fullDesc
      ||
      "";


    document.getElementById(
      "fMunicipality"
    ).value =
      destination.municipality
      ||
      "";


    document.getElementById(
      "fBarangay"
    ).value =
      destination.barangay
      ||
      "";


    document.getElementById(
      "fAddress"
    ).value =
      destination.address
      ||
      "";


    document.getElementById(
      "fLat"
    ).value =
      destination.lat
      ??
      "";


    document.getElementById(
      "fLng"
    ).value =
      destination.lng
      ??
      "";


    document.getElementById(
      "fRepName"
    ).value =
      destination.repName
      ||
      "";


    document.getElementById(
      "fRepEmail"
    ).value =
      destination.repEmail
      ||
      "";


    document.getElementById(
      "fRepPhone"
    ).value =
      destination.repPhone
      ||
      "";


    mainPhotoDataUrl =
      destination.img
      ||
      null;


    supportingPhotos =
      (
        destination.supportingPhotos
        ||
        []
      )
        .map(
          url => ({

            url:
              url,

            preview:
              url,

            file:
              null

          })
        );


    uploadedDocs =
      (
        destination.documents
        ||
        []
      )
        .map(
          item => ({

            name:
              item.name
              ||
              "Document",

            url:
              item.url
              ||
              "",

            file:
              null

          })
        );


    document
      .getElementById(
        "publishToggle"
      )
      .classList.toggle(
        "on",
        destination.status ===
        "Published"
      );


    document.getElementById(
      "publishToggleLabel"
    ).textContent =

      destination.status ===
        "Published"

        ?

        "Published"

        :

        "Not published";


    document.getElementById(
      "saveBtnLabel"
    ).textContent =

      destination.status ===
        "Published"

        ?

        "Update Destination"

        :

        "Publish Destination";


    document.getElementById(
      "deleteDraftBtn"
    ).style.display =
      "flex";


  }


  renderMainPhotoArea();

  renderSupportingPhotos();

  renderDocsList();

  updateChecklist();


  switchView(
    "form"
  );


  /* =========================================================
     LOAD GOOGLE MAP AFTER FORM IS VISIBLE
  ========================================================= */

  requestAnimationFrame(
    async () => {

      await initializeAdminMapPicker();


      /*
         Editing existing destination
      */

      if (
        id
      ) {

        await placePinFromLatLng();

      }


      /*
         Adding new destination
      */

      else {

        resetAdminMapPicker();

      }


      /*
         Make sure map is centered correctly
         after hidden form becomes visible
      */

      setTimeout(
        () => {

          if (
            adminPickerMap
          ) {

            const center =
              adminPickerMap.getCenter();


            if (
              center
            ) {

              adminPickerMap.setCenter(
                center
              );

            }

          }

        },
        100
      );

    }
  );

}


/* =========================================================
   MAIN PHOTO
========================================================= */

function renderMainPhotoArea() {

  const area =
    document.getElementById(
      "mainPhotoArea"
    );


  if (
    mainPhotoDataUrl
  ) {

    area.innerHTML = `

            <div class="main-photo-preview">

                <img
                    src="${mainPhotoDataUrl}"
                    alt="Main photo preview"
                >

                <button
                    class="replace-btn"
                    id="replaceMainPhotoBtn"
                    type="button"
                >

                    <i data-lucide="refresh-cw"></i>

                    Replace

                </button>

            </div>

        `;

  } else {

    area.innerHTML = `

            <div
                class="upload-box"
                id="mainPhotoUpload"
            >

                <div class="ico">

                    <i data-lucide="image-plus"></i>

                </div>

                <strong>
                    Upload main photo
                </strong>

                <span>
                    JPG or PNG, up to 10MB
                </span>

            </div>

        `;

  }


  refreshIcons();


  document
    .getElementById(
      "mainPhotoUpload"
    )
    ?.addEventListener(
      "click",
      () => {

        document
          .getElementById(
            "mainPhotoInput"
          )
          .click();

      }
    );


  document
    .getElementById(
      "replaceMainPhotoBtn"
    )
    ?.addEventListener(
      "click",
      () => {

        document
          .getElementById(
            "mainPhotoInput"
          )
          .click();

      }
    );

}


document
  .getElementById(
    "mainPhotoInput"
  )
  ?.addEventListener(
    "change",
    event => {

      const file =
        event.target.files[0];


      if (
        !file
      ) {

        return;

      }


      if (
        file.size >
        10 * 1024 * 1024
      ) {

        showToast(
          "Photo must be under 10MB."
        );

        return;

      }


      mainPhotoFile =
        file;


      const reader =
        new FileReader();


      reader.onload =
        result => {

          mainPhotoDataUrl =
            result.target.result;


          renderMainPhotoArea();

          updateChecklist();

        };


      reader.readAsDataURL(
        file
      );

    }
  );


/* =========================================================
   SUPPORTING PHOTOS
========================================================= */

function renderSupportingPhotos() {

  const row =
    document.getElementById(
      "supportingPhotosRow"
    );


  row.innerHTML =

    supportingPhotos
      .map(
        (
          photo,
          index
        ) => `

                    <div class="thumb-item">

                        <img
                            src="${photo.preview || photo.url}"
                            alt=""
                        >

                        <button
                            class="thumb-remove"
                            data-remove-photo="${index}"
                            type="button"
                        >

                            <i data-lucide="x"></i>

                        </button>

                    </div>

                `
      )
      .join(
        ""
      )

    +

    (
      supportingPhotos.length < 6

        ?

        `

                    <button
                        class="thumb-add"
                        id="addSupportingPhotoBtn"
                        type="button"
                    >

                        <i data-lucide="plus"></i>

                    </button>

                `

        :

        ""
    );


  refreshIcons();


  document
    .getElementById(
      "addSupportingPhotoBtn"
    )
    ?.addEventListener(
      "click",
      () => {

        document
          .getElementById(
            "supportingPhotoInput"
          )
          .click();

      }
    );


  document
    .querySelectorAll(
      "[data-remove-photo]"
    )
    .forEach(
      button => {

        button.addEventListener(
          "click",
          () => {

            supportingPhotos.splice(

              Number(
                button.getAttribute(
                  "data-remove-photo"
                )
              ),

              1

            );


            renderSupportingPhotos();

            updateChecklist();

          }
        );

      }
    );

}


document
  .getElementById(
    "supportingPhotoInput"
  )
  ?.addEventListener(
    "change",
    event => {

      const file =
        event.target.files[0];


      if (
        !file
        ||
        supportingPhotos.length >=
        6
      ) {

        return;

      }


      const reader =
        new FileReader();


      reader.onload =
        result => {

          supportingPhotos.push({

            file:
              file,

            preview:
              result.target.result,

            url:
              null

          });


          renderSupportingPhotos();

          updateChecklist();

        };


      reader.readAsDataURL(
        file
      );


      event.target.value =
        "";

    }
  );


/* =========================================================
   DOCUMENTS
========================================================= */

function renderDocsList() {

  document.getElementById(
    "docListArea"
  ).innerHTML =

    uploadedDocs
      .map(
        (
          item,
          index
        ) => `

                    <div class="doc-row">

                        <div class="doc-ico">

                            <i data-lucide="file-text"></i>

                        </div>


                        <div class="doc-info">

                            <div class="name">
                                ${item.name}
                            </div>

                            <div class="status">
                                Ready
                            </div>

                        </div>


                        <button
                            class="doc-remove"
                            data-remove-doc="${index}"
                            type="button"
                        >

                            <i data-lucide="x"></i>

                        </button>

                    </div>

                `
      )
      .join(
        ""
      );


  refreshIcons();


  document
    .querySelectorAll(
      "[data-remove-doc]"
    )
    .forEach(
      button => {

        button.addEventListener(
          "click",
          () => {

            uploadedDocs.splice(

              Number(
                button.getAttribute(
                  "data-remove-doc"
                )
              ),

              1

            );


            renderDocsList();

          }
        );

      }
    );

}


document
  .getElementById(
    "docUploadBox"
  )
  ?.addEventListener(
    "click",
    () => {

      document
        .getElementById(
          "docInput"
        )
        .click();

    }
  );


document
  .getElementById(
    "docInput"
  )
  ?.addEventListener(
    "change",
    event => {

      const file =
        event.target.files[0];


      if (
        !file
      ) {

        return;

      }


      uploadedDocs.push({

        name:
          file.name,

        file:
          file,

        url:
          null

      });


      renderDocsList();


      event.target.value =
        "";

    }
  );


/* =========================================================
   GOOGLE MAPS DESTINATION PICKER
========================================================= */

let adminPickerMap =
  null;


let adminPickerMarker =
  null;


/* =========================================================
   SAMAR MAP SETTINGS
========================================================= */

const ADMIN_SAMAR_CENTER = {

  lat:
    11.7753,

  lng:
    124.8861

};


const ADMIN_SAMAR_BOUNDS = {

  north:
    12.75,

  south:
    10.75,

  west:
    124.20,

  east:
    125.75

};


/* =========================================================
   INITIALIZE MAP
========================================================= */

async function initializeAdminMapPicker() {

  if (
    adminPickerMap
  ) {

    return adminPickerMap;

  }


  try {

    await window.adminGoogleMapsReady;


    if (
      !window.google
      ||
      !window.google.maps
    ) {

      throw new Error(
        "Google Maps failed to load."
      );

    }


    const mapElement =
      document.getElementById(
        "mapPicker"
      );


    if (
      !mapElement
    ) {

      return null;

    }


    /* =====================================================
       CREATE SAMAR MAP
    ===================================================== */

    adminPickerMap =
      new google.maps.Map(

        mapElement,

        {

          center:
            ADMIN_SAMAR_CENTER,

          zoom:
            9,

          minZoom:
            8,

          maxZoom:
            21,


          mapTypeId:
            google.maps.MapTypeId.ROADMAP,


          mapTypeControl:
            true,


          mapTypeControlOptions: {

            style:
              google.maps
                .MapTypeControlStyle
                .HORIZONTAL_BAR,

            position:
              google.maps
                .ControlPosition
                .TOP_RIGHT

          },


          streetViewControl:
            false,


          fullscreenControl:
            true,


          zoomControl:
            true,


          scaleControl:
            true,


          gestureHandling:
            "greedy",


          restriction: {

            latLngBounds:
              ADMIN_SAMAR_BOUNDS,

            strictBounds:
              false

          }

        }

      );


    /* =====================================================
       DESTINATION PIN
    ===================================================== */

    adminPickerMarker =
      new google.maps.Marker({

        map:
          adminPickerMap,

        position:
          ADMIN_SAMAR_CENTER,

        draggable:
          true,

        visible:
          false,

        title:
          "Destination location",


        icon: {

          path:
            "M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7z",

          fillColor:
            "#079fa3",

          fillOpacity:
            1,

          strokeColor:
            "#ffffff",

          strokeWeight:
            2,

          scale:
            1.6,

          anchor:
            new google.maps.Point(
              12,
              22
            )

        }

      });


    /* =====================================================
       CLICK MAP = SET LOCATION
    ===================================================== */

    adminPickerMap.addListener(
      "click",
      event => {

        if (
          !event.latLng
        ) {

          return;

        }


        setAdminDestinationPin(

          event.latLng.lat(),

          event.latLng.lng(),

          true

        );

      }
    );


    /* =====================================================
       DRAG PIN = UPDATE LOCATION
    ===================================================== */

    adminPickerMarker.addListener(
      "dragend",
      event => {

        if (
          !event.latLng
        ) {

          return;

        }


        setAdminDestinationPin(

          event.latLng.lat(),

          event.latLng.lng(),

          false

        );

      }
    );


    return adminPickerMap;


  } catch (
  error
  ) {

    console.error(
      "ADMIN MAP ERROR:",
      error
    );


    showToast(
      "Unable to load the Samar map."
    );


    return null;

  }

}


/* =========================================================
   SET DESTINATION PIN
========================================================= */

function setAdminDestinationPin(
  lat,
  lng,
  moveMap = true
) {

  const latitude =
    Number(
      lat
    );


  const longitude =
    Number(
      lng
    );


  if (
    !Number.isFinite(
      latitude
    )
    ||
    !Number.isFinite(
      longitude
    )
  ) {

    return;

  }


  const position = {

    lat:
      latitude,

    lng:
      longitude

  };


  /* =====================================================
     UPDATE LAT / LNG INPUTS
  ===================================================== */

  document.getElementById(
    "fLat"
  ).value =
    latitude.toFixed(
      6
    );


  document.getElementById(
    "fLng"
  ).value =
    longitude.toFixed(
      6
    );


  /* =====================================================
     UPDATE MARKER
  ===================================================== */

  if (
    adminPickerMarker
  ) {

    adminPickerMarker.setPosition(
      position
    );


    adminPickerMarker.setVisible(
      true
    );

  }


  /* =====================================================
     MOVE MAP
  ===================================================== */

  if (
    moveMap
    &&
    adminPickerMap
  ) {

    adminPickerMap.panTo(
      position
    );


    if (
      adminPickerMap.getZoom() <
      14
    ) {

      adminPickerMap.setZoom(
        14
      );

    }

  }


  updateChecklist();

}


/* =========================================================
   PLACE PIN USING SAVED LAT / LNG
========================================================= */

async function placePinFromLatLng() {

  await initializeAdminMapPicker();


  const lat =
    Number(
      document
        .getElementById(
          "fLat"
        )
        .value
    );


  const lng =
    Number(
      document
        .getElementById(
          "fLng"
        )
        .value
    );


  if (
    !Number.isFinite(
      lat
    )
    ||
    !Number.isFinite(
      lng
    )
  ) {

    return;

  }


  setAdminDestinationPin(
    lat,
    lng,
    true
  );

}


/* =========================================================
   RESET MAP FOR NEW DESTINATION
========================================================= */

function resetAdminMapPicker() {

  if (
    adminPickerMarker
  ) {

    adminPickerMarker.setVisible(
      false
    );

  }


  if (
    adminPickerMap
  ) {

    adminPickerMap.setCenter(
      ADMIN_SAMAR_CENTER
    );


    adminPickerMap.setZoom(
      9
    );

  }

}


/* =========================================================
   MANUALLY TYPED COORDINATES
========================================================= */

[
  "fLat",
  "fLng"
]
  .forEach(
    id => {

      document
        .getElementById(
          id
        )
        ?.addEventListener(
          "change",
          () => {

            placePinFromLatLng();

          }
        );

    }
  );


/* =========================================================
   PUBLISH TOGGLE
========================================================= */

document
  .getElementById(
    "publishToggle"
  )
  ?.addEventListener(
    "click",
    () => {

      const toggle =
        document.getElementById(
          "publishToggle"
        );


      toggle.classList.toggle(
        "on"
      );


      const enabled =
        toggle.classList.contains(
          "on"
        );


      document.getElementById(
        "publishToggleLabel"
      ).textContent =

        enabled

          ?

          "Publish immediately"

          :

          "Save as draft only";


      document.getElementById(
        "saveBtnLabel"
      ).textContent =

        enabled

          ?

          (
            editingId
              ?
              "Update Destination"
              :
              "Publish Destination"
          )

          :

          "Save as Draft";

    }
  );


/* =========================================================
   CHECKLIST
========================================================= */

function updateChecklist() {

  const items = [

    {
      label:
        "Destination name added",

      done:
        !!document
          .getElementById(
            "fName"
          )
          .value
          .trim()
    },

    {
      label:
        "Short description added",

      done:
        !!document
          .getElementById(
            "fShortDesc"
          )
          .value
          .trim()
    },

    {
      label:
        "Main photo uploaded",

      done:
        !!mainPhotoDataUrl
    },

    {
      label:
        "At least 2 supporting photos",

      done:
        supportingPhotos.length >=
        2
    },

    {
      label:
        "Location coordinates set",

      done:
        !!document
          .getElementById(
            "fLat"
          )
          .value
          .trim()
        &&
        !!document
          .getElementById(
            "fLng"
          )
          .value
          .trim()
    }

  ];


  document.getElementById(
    "formChecklist"
  ).innerHTML =

    items
      .map(
        item => `

                    <div
                        class="checklist-mini-item ${item.done ? "done" : ""}"
                    >

                        <i
                            data-lucide="${item.done ? "check-circle" : "circle"}"
                        ></i>

                        ${item.label}

                    </div>

                `
      )
      .join(
        ""
      );


  refreshIcons();

}


[
  "fName",
  "fShortDesc",
  "fLat",
  "fLng"
]
  .forEach(
    id => {

      document
        .getElementById(
          id
        )
        ?.addEventListener(
          "input",
          updateChecklist
        );

    }
  );


/* =========================================================
   COLLECT FORM
========================================================= */

function collectFormData() {

  return {

    name:
      document
        .getElementById(
          "fName"
        )
        .value
        .trim(),

    category:
      document
        .getElementById(
          "fCategory"
        )
        .value,

    shortDesc:
      document
        .getElementById(
          "fShortDesc"
        )
        .value
        .trim(),

    fullDesc:
      document
        .getElementById(
          "fFullDesc"
        )
        .value
        .trim(),

    municipality:
      document
        .getElementById(
          "fMunicipality"
        )
        .value
        .trim(),

    barangay:
      document
        .getElementById(
          "fBarangay"
        )
        .value
        .trim(),

    address:
      document
        .getElementById(
          "fAddress"
        )
        .value
        .trim(),

    lat:
      Number(
        document
          .getElementById(
            "fLat"
          )
          .value
      ),

    lng:
      Number(
        document
          .getElementById(
            "fLng"
          )
          .value
      ),

    repName:
      document
        .getElementById(
          "fRepName"
        )
        .value
        .trim(),

    repEmail:
      document
        .getElementById(
          "fRepEmail"
        )
        .value
        .trim(),

    repPhone:
      document
        .getElementById(
          "fRepPhone"
        )
        .value
        .trim()

  };

}


/* =========================================================
   UPLOAD ALL DESTINATION FILES
========================================================= */

async function uploadDestinationFiles(
  destinationId
) {

  let mainPhotoURL =
    (
      mainPhotoDataUrl
      &&
      mainPhotoDataUrl.startsWith(
        "http"
      )
    )

      ?

      mainPhotoDataUrl

      :

      "";


  if (
    mainPhotoFile
  ) {

    mainPhotoURL =
      await uploadFile(

        mainPhotoFile,

        `destinations/${destinationId}/main/${Date.now()}-${cleanFileName(mainPhotoFile.name)}`

      );

  }


  const supportingURLs =
    [];


  for (
    const photo
    of
    supportingPhotos
  ) {

    if (
      photo.url
    ) {

      supportingURLs.push(
        photo.url
      );

      continue;

    }


    if (
      photo.file
    ) {

      const url =
        await uploadFile(

          photo.file,

          `destinations/${destinationId}/photos/${Date.now()}-${cleanFileName(photo.file.name)}`

        );


      supportingURLs.push(
        url
      );

    }

  }


  const documentList =
    [];


  for (
    const item
    of
    uploadedDocs
  ) {

    if (
      item.url
    ) {

      documentList.push({

        name:
          item.name,

        url:
          item.url

      });


      continue;

    }


    if (
      item.file
    ) {

      const url =
        await uploadFile(

          item.file,

          `destinations/${destinationId}/documents/${Date.now()}-${cleanFileName(item.file.name)}`

        );


      documentList.push({

        name:
          item.name,

        url:
          url

      });

    }

  }


  return {

    mainPhotoURL,
    supportingURLs,
    documentList

  };

}


/* =========================================================
   SAVE DESTINATION TO FIREBASE
========================================================= */

async function saveDestination(
  forcePublish
) {

  const data =
    collectFormData();


  const wantsPublish =
    forcePublish !==
      undefined

      ?

      forcePublish

      :

      document
        .getElementById(
          "publishToggle"
        )
        .classList
        .contains(
          "on"
        );


  if (
    !data.name
  ) {

    showToast(
      "Enter a destination name."
    );

    return;

  }


  if (
    !data.shortDesc
  ) {

    showToast(
      "Enter a short description."
    );

    return;

  }


  if (
    !data.municipality
  ) {

    showToast(
      "Enter the municipality."
    );

    return;

  }


  if (
    !Number.isFinite(
      data.lat
    )
    ||
    !Number.isFinite(
      data.lng
    )
  ) {

    showToast(
      "Set valid coordinates."
    );

    return;

  }


  if (
    wantsPublish
    &&
    !mainPhotoDataUrl
  ) {

    showToast(
      "Upload a main photo before publishing."
    );

    return;

  }


  if (
    wantsPublish
    &&
    supportingPhotos.length <
    2
  ) {

    showToast(
      "Add at least 2 supporting photos."
    );

    return;

  }


  if (
    wantsPublish
    &&
    (
      !document.getElementById(
        "d1"
      ).checked

      ||

      !document.getElementById(
        "d2"
      ).checked

      ||

      !document.getElementById(
        "d3"
      ).checked
    )
  ) {

    showToast(
      "Confirm all declarations before publishing."
    );

    return;

  }


  const saveButton =
    document.getElementById(
      "saveDestinationBtn"
    );


  const draftButton =
    document.getElementById(
      "saveDraftBtn"
    );


  try {

    saveButton.disabled =
      true;


    draftButton.disabled =
      true;


    document.getElementById(
      "saveBtnLabel"
    ).textContent =
      "Uploading...";


    const destinationId =
      editingId
      ||
      doc(
        collection(
          db,
          "destinations"
        )
      ).id;


    const existing =
      destinations.find(
        item =>
          item.id ===
          destinationId
      );


    const uploads =
      await uploadDestinationFiles(
        destinationId
      );


    const destinationData = {

      ...data,

      img:
        uploads.mainPhotoURL
        ||
        existing?.img
        ||
        "",

      supportingPhotos:
        uploads.supportingURLs,

      documents:
        uploads.documentList,

      status:
        wantsPublish
          ?
          "Published"
          :
          "Draft",

      views:
        Number(
          existing?.views
          ||
          0
        ),

      saves:
        Number(
          existing?.saves
          ||
          0
        ),

      rating:
        Number(
          existing?.rating
          ||
          0
        ),

      updated:
        todayLabel(),

      updatedAt:
        serverTimestamp()

    };


    if (
      !editingId
    ) {

      destinationData.createdAt =
        serverTimestamp();

    }


    await setDoc(

      doc(
        db,
        "destinations",
        destinationId
      ),

      destinationData,

      {
        merge:
          true
      }

    );


    showToast(

      wantsPublish

        ?

        `"${data.name}" is now live.`

        :

        `"${data.name}" saved as draft.`

    );


    editingId =
      null;


    switchView(
      "destinations"
    );


  } catch (
  error
  ) {

    console.error(
      "SAVE DESTINATION ERROR:",
      error
    );


    showToast(
      error.message
    );


  } finally {

    saveButton.disabled =
      false;


    draftButton.disabled =
      false;


    document.getElementById(
      "saveBtnLabel"
    ).textContent =
      "Publish Destination";

  }

}


/* =========================================================
   SAVE BUTTONS
========================================================= */

document
  .getElementById(
    "saveDestinationBtn"
  )
  ?.addEventListener(
    "click",
    async () => {

      const wantsPublish =
        document
          .getElementById(
            "publishToggle"
          )
          .classList
          .contains(
            "on"
          );


      await saveDestination(
        wantsPublish
      );

    }
  );


document
  .getElementById(
    "saveDraftBtn"
  )
  ?.addEventListener(
    "click",
    async () => {

      await saveDestination(
        false
      );

    }
  );


document
  .getElementById(
    "deleteDraftBtn"
  )
  ?.addEventListener(
    "click",
    () => {

      if (
        !editingId
      ) {

        return;

      }


      pendingDeleteId =
        editingId;


      document
        .getElementById(
          "deleteModalBackdrop"
        )
        .classList.add(
          "show"
        );

    }
  );


/* =========================================================
   RENDER REALTIME TRAVELER COMMENTS
========================================================= */

function renderReviews() {

  const reviewsList =
    document.getElementById(
      "reviewsList"
    );


  const reviewsResultCount =
    document.getElementById(
      "reviewsResultCount"
    );


  const reviewsSidebarBadge =
    document.getElementById(
      "reviewsSidebarBadge"
    );


  if (
    !reviewsList
  ) {

    return;

  }


  /* =====================================================
     SORT NEWEST COMMENT FIRST
  ===================================================== */

  const comments =
    [
      ...adminComments
    ]
      .sort(
        (
          first,
          second
        ) =>

          getAdminCommentTime(
            second
          )

          -

          getAdminCommentTime(
            first
          )
      );


  /* =====================================================
     UPDATE COMMENT COUNT
  ===================================================== */

  const total =
    comments.length;


  if (
    reviewsResultCount
  ) {

    reviewsResultCount.textContent =

      total ===
        1

        ?

        "1 traveler comment"

        :

        `${total} traveler comments`;

  }


  if (
    reviewsSidebarBadge
  ) {

    reviewsSidebarBadge.textContent =
      total >
        99

        ?

        "99+"

        :

        String(
          total
        );


    reviewsSidebarBadge.hidden =
      total ===
      0;

  }


  /* =====================================================
     EMPTY STATE
  ===================================================== */

  if (
    total ===
    0
  ) {

    reviewsList.innerHTML = `

      <div class="admin-reviews-empty">

        <div class="admin-reviews-empty-icon">

          <i data-lucide="message-circle"></i>

        </div>


        <h4>
          No traveler comments yet
        </h4>


        <p>
          Comments submitted by travelers will
          automatically appear here.
        </p>

      </div>

    `;


    refreshIcons();

    return;

  }


  /* =====================================================
     BUILD COMMENT CARDS
  ===================================================== */

  reviewsList.innerHTML =

    comments
      .map(
        comment => {

          const userName =
            comment.userName
            ||
            "Traveler";


          const destinationName =
            getAdminDestinationName(
              comment.destinationId
            );


          const rating =
            getAdminUserDestinationRating(

              comment.userId,

              comment.destinationId

            );


          const initials =
            getAdminCommentInitials(
              userName
            );


          const profilePhoto =
            comment.userPhoto
            ||
            "";


          const avatarHTML =

            profilePhoto

              ?

              `

                <img
                  src="${escapeAdminHTML(profilePhoto)}"
                  alt="${escapeAdminHTML(userName)}"
                  referrerpolicy="no-referrer"
                >

              `

              :

              escapeAdminHTML(
                initials
              );


          const ratingHTML =

            rating >
              0

              ?

              `

                <div
                  class="admin-review-stars"
                  aria-label="${rating} out of 5 stars"
                >

                  <span>
                    ${"★".repeat(rating)}
                  </span>

                  <span class="empty">
                    ${"★".repeat(
                Math.max(
                  0,
                  5 -
                  rating
                )
              )}
                  </span>

                  <small>
                    ${rating}.0
                  </small>

                </div>

              `

              :

              `

                <div class="admin-review-no-rating">

                  <i data-lucide="star"></i>

                  No rating submitted

                </div>

              `;


          return `

            <article
              class="admin-review-card"
              data-comment-id="${escapeAdminHTML(comment.id)}"
              data-destination-id="${escapeAdminHTML(comment.destinationId)}"
            >

              <div class="admin-review-avatar">

                ${avatarHTML}

              </div>


              <div class="admin-review-body">

                <div class="admin-review-heading">

                  <div>

                    <div class="admin-review-user">

                      ${escapeAdminHTML(userName)}

                    </div>


                    <div class="admin-review-destination">

                      <i data-lucide="map-pin"></i>

                      Commented on

                      <strong>
                        ${escapeAdminHTML(destinationName)}
                      </strong>

                    </div>

                  </div>


                  <time class="admin-review-time">

                    ${escapeAdminHTML(
            formatAdminCommentTime(
              comment
            )
          )}

                  </time>

                </div>


                ${ratingHTML}


                <p class="admin-review-text">

                  ${escapeAdminHTML(
            comment.text
            ||
            ""
          )}

                </p>

              </div>

            </article>

          `;

        }
      )
      .join(
        ""
      );


  refreshIcons();

}

/* =========================================================
   REALTIME COMMENTS & RATINGS
========================================================= */

function startRealtimeReviewsListener() {

  /* =====================================================
     DON'T START DUPLICATE LISTENERS
  ===================================================== */

  if (
    adminCommentsUnsubscribe
  ) {

    adminCommentsUnsubscribe();

    adminCommentsUnsubscribe =
      null;

  }


  if (
    adminRatingsUnsubscribe
  ) {

    adminRatingsUnsubscribe();

    adminRatingsUnsubscribe =
      null;

  }


  /* =====================================================
     ALL TRAVELER COMMENTS
  ===================================================== */

  adminCommentsUnsubscribe =
    onSnapshot(

      collection(
        db,
        "destinationComments"
      ),

      snapshot => {

        adminComments =
          snapshot.docs.map(
            documentSnapshot => ({

              id:
                documentSnapshot.id,

              ...documentSnapshot.data()

            })
          );


        console.log(
          "Realtime traveler comments:",
          adminComments
        );


        renderReviews();

        refreshRealtimeAdminNotifications();

      },

      error => {

        console.error(
          "ADMIN COMMENTS FIRESTORE ERROR:",
          error
        );


        const reviewsList =
          document.getElementById(
            "reviewsList"
          );


        if (
          reviewsList
        ) {

          reviewsList.innerHTML = `

            <div class="admin-reviews-empty">

              <h4>
                Unable to load comments
              </h4>

              <p>
                Check Firestore permissions and try again.
              </p>

            </div>

          `;

        }

      }

    );


  /* =====================================================
     ALL TRAVELER RATINGS
  ===================================================== */

  adminRatingsUnsubscribe =
    onSnapshot(

      collection(
        db,
        "destinationRatings"
      ),

      snapshot => {

        adminRatings =
          snapshot.docs.map(
            documentSnapshot => ({

              id:
                documentSnapshot.id,

              ...documentSnapshot.data()

            })
          );


        console.log(
          "Realtime traveler ratings:",
          adminRatings
        );


        /*
           Re-render comments so their matching rating
           appears beside them.
        */

        renderReviews();

        refreshRealtimeAdminNotifications();

      },

      error => {

        console.error(
          "ADMIN RATINGS FIRESTORE ERROR:",
          error
        );

      }

    );

}


/* =========================================================
   ACCOUNT
========================================================= */

document
  .getElementById(
    "saveAccountBtn"
  )
  ?.addEventListener(
    "click",
    () => {

      showToast(
        "Account settings saved."
      );

    }
  );


/* =========================================================
   RENDER
========================================================= */

function renderAll() {

  renderStats();

  renderRecentDest();

  renderActivity();

  renderNotifPanel();

  renderReviews();

}

/* =========================================================
   DOT ADMIN AUTHENTICATION
========================================================= */

const dotLoginScreen =
  document.getElementById(
    "dotLoginScreen"
  );


const dotAdminShell =
  document.getElementById(
    "dotAdminShell"
  );


const dotLoginForm =
  document.getElementById(
    "dotLoginForm"
  );


const dotAdminEmail =
  document.getElementById(
    "dotAdminEmail"
  );


const dotAdminPassword =
  document.getElementById(
    "dotAdminPassword"
  );


const dotLoginButton =
  document.getElementById(
    "dotLoginButton"
  );


const dotLoginMessage =
  document.getElementById(
    "dotLoginMessage"
  );


let dotAdminStarted =
  false;


/* =========================================================
   SHOW LOGIN ERROR
========================================================= */

function showDotLoginMessage(
  message
) {

  if (
    !dotLoginMessage
  ) {

    return;

  }


  dotLoginMessage.textContent =
    message;


  dotLoginMessage.hidden =
    false;

}


/* =========================================================
   SIGN IN DOT ADMIN
========================================================= */

dotLoginForm
  ?.addEventListener(
    "submit",
    async event => {

      event.preventDefault();


      const email =
        dotAdminEmail.value
          .trim();


      const password =
        dotAdminPassword.value;


      if (
        !email
        ||
        !password
      ) {

        return;

      }


      dotLoginButton.disabled =
        true;


      dotLoginMessage.hidden =
        true;


      try {

        /* =========================================
           KEEP DOT ADMIN LOGGED IN
        ========================================= */

        await setPersistence(
          auth,
          browserLocalPersistence
        );


        /* =========================================
           FIREBASE AUTHENTICATION
        ========================================= */

        await signInWithEmailAndPassword(

          auth,

          email,

          password

        );


        /*
           onAuthStateChanged() below will
           open the admin dashboard.
        */

      } catch (
      error
      ) {

        console.error(
          "DOT FIREBASE LOGIN ERROR:",
          error
        );


        let message =
          "Unable to sign in. Check your email and password.";


        if (
          error.code ===
          "auth/invalid-credential"
        ) {

          message =
            "Incorrect email or password.";

        }


        if (
          error.code ===
          "auth/too-many-requests"
        ) {

          message =
            "Too many attempts. Please try again later.";

        }


        showDotLoginMessage(
          message
        );

      } finally {

        dotLoginButton.disabled =
          false;

      }

    }
  );


/* =========================================================
   START DOT ADMIN
========================================================= */

function initializeDOTAdmin() {

  if (
    dotAdminStarted
  ) {

    return;

  }


  dotAdminStarted =
    true;


  refreshIcons();

  renderNotifPanel();

  renderActivity();

  renderReviews();


  /* =========================================
     FIRESTORE LISTENER STARTS ONLY
     AFTER FIREBASE AUTH SUCCEEDS
  ========================================= */

  startRealtimeDestinationListener();

  startRealtimeReviewsListener();

  startRealtimeAdminSavedPlacesListener();

}

/* =========================================================
   DOT ADMIN LOGOUT
========================================================= */

document
  .querySelector(
    ".sidebar-logout"
  )
  ?.addEventListener(
    "click",
    async () => {

      try {

        await signOut(
          auth
        );


        console.log(
          "DOT Admin signed out."
        );

      } catch (
      error
      ) {

        console.error(
          "DOT LOGOUT ERROR:",
          error
        );

      }

    }
  );


/* =========================================================
   FIREBASE AUTH STATE
========================================================= */

onAuthStateChanged(

  auth,

  user => {

    console.log(
      "DOT FIREBASE AUTH USER:",
      user
        ? user.email
        : "Not signed in"
    );


    /* =========================================
       SIGNED OUT
    ========================================= */

    if (
      !user
    ) {

      /* =========================================
   STOP REVIEW LISTENERS
========================================= */

      if (
        adminCommentsUnsubscribe
      ) {

        adminCommentsUnsubscribe();

        adminCommentsUnsubscribe =
          null;

      }


      if (
        adminRatingsUnsubscribe
      ) {

        adminRatingsUnsubscribe();

        adminRatingsUnsubscribe =
          null;

      }


      adminComments =
        [];


      adminRatings =
        [];

      if (
        adminSavedPlacesUnsubscribe
      ) {

        adminSavedPlacesUnsubscribe();

        adminSavedPlacesUnsubscribe =
          null;

      }


      adminSavedPlaces =
        [];

      dotAdminStarted =
        false;


      dotAdminShell.hidden =
        true;


      dotLoginScreen.hidden =
        false;


      refreshIcons();

      return;

    }


    /* =========================================
       SIGNED IN
    ========================================= */

    dotLoginScreen.hidden =
      true;


    dotAdminShell.hidden =
      false;


    initializeDOTAdmin();

  }

);
