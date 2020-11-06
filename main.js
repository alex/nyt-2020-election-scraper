const features = {};
const isFeatureEnabled = (key) => localStorage.getItem(key) === "true";

const feature = (key, buttonId, defaultValue, onEnable, onDisable) => {
  if (localStorage.getItem(key) == null) {
    localStorage.setItem(key, defaultValue);
  }

  const button = $(buttonId);
  button.on("click", function () {
    if (isFeatureEnabled(key)) {
      localStorage.setItem(key, "false");
      onDisable(button);
    } else {
      localStorage.setItem(key, "true");
      onEnable(button);
    }
  });

  if (isFeatureEnabled(key)) {
    onEnable(button);
  }

  features[key] = {
    buttonId,
    onEnable,
    onDisable,
  };
};

const refreshFeature = (key) => {
  if (isFeatureEnabled(key)) {
    features[key].onEnable($(features[key].buttonId));
  } else {
    features[key].onDisable($(features[key].buttonId));
  }
};

const loadTooltips = () => {
  $(function () {
    $('[data-toggle="tooltip"]').tooltip({ boundary: "window" });
  });
};
loadTooltips();

const shrinkTablesFeature = "shrunk";
feature(
  shrinkTablesFeature,
  "#shrink_button",
  true,
  (button) => {
    button.html("Expand Tables");
    $(".table").each(function () {
      var countOfNonHiddenBlock = 0;
      var lastCount = -1;
      $(this)
        .find("tbody tr")
        .each(function () {
          var value = parseInt($(this).find("td:nth(4)").text());
          if (countOfNonHiddenBlock >= 3 || (value === 0 && lastCount === 0)) {
            $(this).hide();
          } else {
            countOfNonHiddenBlock++;
          }
          lastCount = value;
        });
    });
  },
  (button) => {
    button.html("Shrink Tables");
    $(".table").each(function () {
      $(this).find("tbody tr").show();
    });
  }
);

// grab the latest html and return it as a Document
const fetchLatestContent = async () => {
  const contentResponse = await fetch(location.toString(), {
    cache: "no-cache",
  });
  const contentBody = await contentResponse.text();
  const contentDom = new DOMParser().parseFromString(contentBody, "text/html");

  let contentMetadata;
  if (contentDom.getElementById("page-metadata")) {
    contentMetadata = JSON.parse(
      contentDom.getElementById("page-metadata").innerText
    );
  } else {
    contentMetadata = {
      template_hash: contentDom.getElementById("template-hash").innerText,
    };
  }
  return {
    metadata: contentMetadata,
    dom: contentDom,
  };
};

// check if the current host is a development host
const isDeveloperEnvironment = () => {
  return (
    location.protocol === "file:" ||
    location.hostname === "localhost" ||
    location.hostname === "127.0.0.1"
  );
};

// if the new page has notifications, show them
// if the new page is an updated template, hard refresh (which should get us the new page since we just loaded it)
// otherwise, replace the div id=body element
const updateCheck = async (currentMetadata, forceNotify) => {
  const latestContent = await fetchLatestContent();
  const latestMetadata = latestContent.metadata;
  const latestDom = latestContent.dom;
  console.log("latest content", latestContent);

  let shouldNotify =
    latestMetadata.states_updated.length &&
    (forceNotify ||
      (currentMetadata &&
        currentMetadata.results_hash !== latestMetadata.results_hash));

  if (
    currentMetadata &&
    currentMetadata.template_hash !== latestMetadata.template_hash
  ) {
    console.log("new template, forcing reload");
    if (shouldNotify) {
      location.hash = "notify";
    }
    location.reload(true);
    return;
  }

  if (shouldNotify && Notification.permission === "granted") {
    const notification = new Notification(
      `New ballots were counted in: ${latestMetadata.states_updated.join(
        ", "
      )}!`
    );
    notification.onclick = function (event) {
      // focus page
      window.parent.focus();
      // just in case, older browsers
      window.focus();
      // dismiss notification
      event.target.close();
    };
  }

  $('[data-toggle="tooltip"]').tooltip("hide");

  const elementsToUpdate = [
    ...Array.from(document.getElementsByTagName("table")),
    document.getElementById("timestamps"),
  ];

  elementsToUpdate.forEach((oldElement) => {
    let newElement = latestContent.dom.getElementById(oldElement.id);
    oldElement.parentNode.replaceChild(newElement, oldElement);
  });

  loadTooltips();
  refreshFeature(shrinkTablesFeature);

  return latestContent.metadata;
};

// do a test update
updateCheck(undefined, location.hash === "#notify");
location.hash = "";

const startLiveUpdates = async () => {
  let currentMetadata = (await fetchLatestContent()).metadata;
  console.log("current content", currentMetadata);

  const nextCheck = () => {
    return isDeveloperEnvironment() ? 5 * 1000 : 60 * 1000;
  };

  const runner = async () => {
    if (!isFeatureEnabled(liveUpdatesFeature)) return;

    try {
      currentMetadata = await updateCheck(currentMetadata, false);
    } catch (e) {
      console.log("failed to check for updates", e);
    }
    setTimeout(runner, nextCheck());
  };

  setTimeout(runner, nextCheck());
};

const liveUpdatesFeature = "live-updates";
feature(
  liveUpdatesFeature,
  "#live_update_button",
  false,
  (button) => {
    button.html("Disable Live Updates");

    if ("Notification" in window && Notification.permission !== "granted") {
      Notification.requestPermission();
    }

    startLiveUpdates();
  },
  (button) => {
    button.html("Enable Live Updates");
  }
);
