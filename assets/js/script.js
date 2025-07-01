const defaultMaleImg =
  "https://img.icons8.com/?size=100&id=GwYVu5UZRjBe&format=png&color=000000";
const defaultFemaleImg =
  "https://img.icons8.com/?size=100&id=IlBlSvhW3h6Z&format=png&color=000000";

let nodeIdCounter = 0;

async function loadFamilyData() {
  try {
    const response = await fetch(
      "https://raw.githubusercontent.com/Lokeshsinghthakur/chouhanpariwar/refs/heads/main/data.json"
    );
    if (!response.ok) throw new Error(`HTTP error! Status: ${response.status}`);
    return await response.json();
  } catch (error) {
    console.error("Error loading JSON:", error);
    alert("डेटा लोड करने में त्रुटि: " + error.message);
    return null;
  }
}

function convertToTreantNode(node) {
  const displayName = node.name;
  const genderText = node.gender === "F" ? "महिला" : "पुरुष";
  const img =
    node.image || (node.gender === "F" ? defaultFemaleImg : defaultMaleImg);
  const uniqueNodeId = `${displayName}-${nodeIdCounter++}`;

  const tooltipParts = [
    `नाम: ${displayName} (${node.spouse})`,
    node.dob && `जन्म तिथि: ${node.dob}`,
    node.dod && `मृत्यु तिथि: ${node.dod}`,
    `लिंग: ${genderText}`,
  ]
    .filter(Boolean)
    .join("\n");

  const treantNode = {
    innerHTML: `<div style="display:flex; flex-direction:column; align-items:center; justify-content:center;" title="${tooltipParts}" data-node-id="${uniqueNodeId}">
    <img src="${img}" alt="${displayName} photo"/>
    <div>${displayName}</div>
  </div>`,
    nodeId: uniqueNodeId,
  };

  if (node.children && node.children.length > 0) {
    treantNode.children = node.children.map(convertToTreantNode);
  }

  return treantNode;
}

async function initializeChart() {
  const familyData = await loadFamilyData();
  if (!familyData) return;

  try {
    const config = {
      chart: {
        container: "#tree-simple",
        levelSeparation: 60, // Reduced vertical spacing
        siblingSeparation: 5, // Reduced horizontal spacing between siblings
        subTeeSeparation: 15, // Reduced horizontal spacing between subtrees
        rootOrientation: "SOUTH", // Changed to NORTH for vertical growth
        nodeAlign: "BOTTOM",
        node: {
          HTMLclass: "node",
        },
      },
      nodeStructure: convertToTreantNode(familyData),
    };

    const chart = new Treant(config);
  } catch (error) {
    console.error("Error initializing Treant chart:", error);
    alert("वंश वृक्ष लोड करने में त्रुटि: " + error.message);
  }
}

const container = document.getElementById("tree-simple");

function centerFatherNodes(familyData) {
  try {
    const fatherElements = Array.from(
      document.querySelectorAll(".node")
    ).filter((node) => {
      const nodeId = node.getAttribute("data-node-id");
      const nodeName = nodeId.split("-")[0];
      return familyData.children.some(
        (child) =>
          (child.name === nodeName || child.englishName === nodeName) &&
          child.children
      );
    });

    if (fatherElements.length > 0) {
      const rects = fatherElements.map((el) => el.getBoundingClientRect());
      const minX = Math.min(...rects.map((r) => r.left));
      const maxX = Math.max(...rects.map((r) => r.right));
      const minY = Math.min(...rects.map((r) => r.top));
      const maxY = Math.max(...rects.map((r) => r.bottom));
      const containerRect = container.getBoundingClientRect();

      container.scrollLeft =
        (minX + maxX - containerRect.width) / 2 + container.scrollLeft;
      container.scrollTop = minY - containerRect.top + container.scrollTop - 50;
    }
  } catch (error) {
    console.error("Error in centerFatherNodes:", error);
  }
}

function collectAllNames(data, names = []) {
  names.push({ name: data.name, englishName: data.englishName || "" });
  if (data.children) {
    data.children.forEach((child) => collectAllNames(child, names));
  }
  return names;
}

async function getAllNames() {
  const familyData = await loadFamilyData();
  if (!familyData) return [];
  return collectAllNames(familyData);
}

function findNodeByName(data, searchTerm) {
  const searchLower = searchTerm.toLowerCase();
  if (
    data.name.toLowerCase() === searchLower ||
    (data.englishName && data.englishName.toLowerCase() === searchLower)
  ) {
    return data;
  }
  if (data.children) {
    for (const child of data.children) {
      const result = findNodeByName(child, searchTerm);
      if (result) return result;
    }
  }
  return null;
}

async function findAdjacentNodes(targetNode) {
  const familyData = await loadFamilyData();
  if (!familyData) return [];

  function search(data, target, parent = null, adjacent = []) {
    if (data === target) {
      if (data.children) adjacent.push(...data.children);
      if (data.spouse) {
        const spouseNode = findNodeByName(familyData, data.spouse);
        if (spouseNode) adjacent.push(spouseNode);
      }
      if (parent) adjacent.push(parent);
      return adjacent;
    }
    if (data.children) {
      for (const child of data.children) {
        search(child, target, data, adjacent);
      }
    }
    return adjacent;
  }

  return search(familyData, targetNode);
}

function clearHighlights() {
  document
    .querySelectorAll(".node.highlighted, .node.adjacent")
    .forEach((node) => {
      node.classList.remove("highlighted", "adjacent");
    });
}

async function performSearch(searchName) {
  if (!searchName) {
    alert("कृपया एक नाम दर्ज करें!");
    return;
  }

  const familyData = await loadFamilyData();
  if (!familyData) return;

  clearHighlights();
  const node = findNodeByName(familyData, searchName);
  if (node) {
    const nodeElements = Array.from(
      document.querySelectorAll(
        `[data-node-id^="${CSS.escape(
          node.name
        )}"], [data-node-id^="${CSS.escape(node.englishName || "")}"]`
      )
    );
    if (nodeElements.length > 0) {
      nodeElements.forEach((el) => el.classList.add("highlighted"));

      const adjacentNodes = await findAdjacentNodes(node);
      adjacentNodes.forEach((adjNode) => {
        const adjElements = Array.from(
          document.querySelectorAll(
            `[data-node-id^="${CSS.escape(
              adjNode.name
            )}"], [data-node-id^="${CSS.escape(adjNode.englishName || "")}"]`
          )
        );
        adjElements.forEach((el) => el.classList.add("adjacent"));
      });

      const firstNodeElement = nodeElements[0];
      firstNodeElement.scrollIntoView({
        behavior: "smooth",
        block: "center",
        inline: "center",
      });

      setTimeout(() => {
        const rect = firstNodeElement.getBoundingClientRect();
        const containerRect = container.getBoundingClientRect();
        if (
          rect.top < containerRect.top ||
          rect.bottom > containerRect.bottom ||
          rect.left < containerRect.left ||
          rect.right > containerRect.right
        ) {
          container.scrollLeft =
            rect.left -
            containerRect.left +
            container.scrollLeft -
            containerRect.width / 2 +
            rect.width / 2;
          container.scrollTop =
            rect.top -
            containerRect.top +
            container.scrollTop -
            containerRect.height / 2 +
            rect.height / 2;
        }
      }, 500);
    } else {
      alert("नाम मिला, लेकिन नोड दृश्यमान नहीं है!");
    }
  } else {
    alert("नाम नहीं मिला!");
  }
}

const searchInput = document.getElementById("search-input");
const suggestionsDiv = document.getElementById("suggestions");

searchInput.addEventListener("input", async () => {
  const query = searchInput.value.trim().toLowerCase();
  suggestionsDiv.innerHTML = "";
  suggestionsDiv.style.display = "none";

  if (query) {
    const allNames = await getAllNames();
    const matches = allNames
      .filter(
        (item) =>
          item.name.toLowerCase().includes(query) ||
          (item.englishName && item.englishName.toLowerCase().includes(query))
      )
      .slice(0, 5);

    if (matches.length > 0) {
      matches.forEach((item) => {
        const div = document.createElement("div");
        div.className = "suggestion-item";
        div.textContent = `${item.name} (${item.englishName || "N/A"})`;
        div.addEventListener("click", () => {
          searchInput.value = item.name;
          suggestionsDiv.innerHTML = "";
          suggestionsDiv.style.display = "none";
          performSearch(item.name);
        });
        suggestionsDiv.appendChild(div);
      });
      suggestionsDiv.style.display = "block";
    }
  }
});

document.addEventListener("click", (e) => {
  if (!searchInput.contains(e.target) && !suggestionsDiv.contains(e.target)) {
    suggestionsDiv.style.display = "none";
  }
});

document.getElementById("search-button").addEventListener("click", () => {
  const searchName = searchInput.value.trim();
  performSearch(searchName);
});

document.getElementById("reset-button").addEventListener("click", async () => {
  clearHighlights();
  searchInput.value = "";
  suggestionsDiv.innerHTML = "";
  suggestionsDiv.style.display = "none";
  const familyData = await loadFamilyData();
  if (familyData) centerFatherNodes(familyData);
});

window.addEventListener("load", async () => {
  if (typeof Treant === "undefined") {
    console.error("Treant.js failed to load.");
    alert("वंश वृक्ष लोड करने में त्रुटि: Treant.js लोड नहीं हुआ।");
  } else {
    await initializeChart();
    const familyData = await loadFamilyData();
    if (familyData) centerFatherNodes(familyData);
  }
});
