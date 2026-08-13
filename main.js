// main.js

function pickIcon(spot) {
  const text = (spot.name + " " + spot.description).toLowerCase();

  if (text.includes("beach") || text.includes("surf") || text.includes("boardwalk")) return "🏖️";
  if (text.includes("beer") || text.includes("brewery")) return "🍺";
  if (text.includes("food") || text.includes("burger") || text.includes("brunch") || text.includes("dessert") || text.includes("dinner") || text.includes("café") || text.includes("cafe")) return "🍽️";
  if (text.includes("museum") || text.includes("library") || text.includes("mummies")) return "🏛️";
  if (text.includes("hike") || text.includes("trail") || text.includes("run") || text.includes("park")) return "🥾";
  if (text.includes("aquarium") || text.includes("scuba") || text.includes("dive")) return "🐠";
  if (text.includes("shop") || text.includes("thrift") || text.includes("fashion") || text.includes("market")) return "🛍️";
  if (text.includes("concert") || text.includes("music") || text.includes("casbah") || text.includes("organ")) return "🎶";
  if (text.includes("bike") || text.includes("cruise")) return "🚲";
  if (text.includes("ghost") || text.includes("haunted")) return "👻";
  if (text.includes("theater") || text.includes("globe") || text.includes("grinch")) return "🎭";
  if (text.includes("zoo") || text.includes("animal") || text.includes("legoland")) return "🦁";

  return "📍";
}

$(document).ready(function () {
  $.getJSON("data.json", function (spots) {
    const tableBody = $("#spots-table tbody");

    spots.forEach(function (spot, index) {
      const latitude = spot.location[0];
      const longitude = spot.location[1];
      const mapLink = `https://www.google.com/maps?q=${latitude},${longitude}`;
      const icon = pickIcon(spot);
      const delay = (index * 0.06).toFixed(2);

      const row = $(`
        <tr style="animation-delay: ${delay}s;">
          <td>${spot.name}</td>
          <td>${spot.description}</td>
          <td><a href="${mapLink}" target="_blank">View on Map</a></td>
        </tr>
      `);

      tableBody.append(row);
    });
  });
});