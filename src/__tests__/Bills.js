/**
 * @jest-environment jsdom
 */
import "mutationobserver-shim";
import { screen, waitFor } from "@testing-library/dom";
import BillsUI from "../views/BillsUI.js";
import { bills } from "../fixtures/bills.js";
import { ROUTES_PATH } from "../constants/routes.js";
import { localStorageMock } from "../__mocks__/localStorage.js";

import router from "../app/Router.js";

describe("Given I am connected as an employee", () => {
  describe("When I am on Bills Page", () => {
    test("Then bill icon in vertical layout should be highlighted", async () => {
      Object.defineProperty(window, "localStorage", {
        value: localStorageMock,
      });
      window.localStorage.setItem(
        "user",
        JSON.stringify({
          type: "Employee",
        })
      );
      const root = document.createElement("div");
      root.setAttribute("id", "root");
      document.body.append(root);
      router();
      window.onNavigate(ROUTES_PATH.Bills);
      await waitFor(() => screen.getByTestId("icon-window"));
      const windowIcon = screen.getByTestId("icon-window");
      //to-do write expect expression
    });
    test("Then bills should be ordered from earliest to latest", () => {
      document.body.innerHTML = BillsUI({ data: bills });
      // 🔥 1️⃣ Récupère TOUS les <td> qui ont data-testid="bill-date"
      const dates = screen
        .getAllByTestId("bill-date")
        .map((dateEl) => dateEl.getAttribute("data-date-iso")); // 👈 récupère la vraie date ISO

      // 🔥 2️⃣ Trie du plus récent au plus ancien
      const datesSorted = [...dates].sort((a, b) => new Date(b) - new Date(a));

      // 🔥 3️⃣ Vérifie si l'ordre dans le DOM est déjà trié
      expect(dates).toEqual(datesSorted);
    });
  });
});
