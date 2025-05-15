global.$ = require("jquery");
/**
 * @jest-environment jsdom
 */
import "mutationobserver-shim";
import { fireEvent, screen, waitFor } from "@testing-library/dom";
import BillsUI from "../views/BillsUI.js";
import { bills } from "../fixtures/bills.js";
import { ROUTES_PATH, ROUTES } from "../constants/routes.js";
import { localStorageMock } from "../__mocks__/localStorage.js";
import Bills from "../containers/Bills.js";
import mockStore from "../__mocks__/store.js";
import userEvent from "@testing-library/user-event";
import router from "../app/Router.js";
$.fn.modal = jest.fn(); // Simule la méthode modal de jQuery
jest.mock("../app/store", () => mockStore);

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
      // ✅ Ajout de l'expect ici
      expect(windowIcon.classList.contains("active-icon")).toBe(true);
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
    //Vérifie qu’un clic sur le bouton "Nouvelle note de frais" appelle bien la méthode qui redirige vers la page correspondante.
    test("Then clicking on 'Nouvelle note de frais' should navigate to NewBill page", () => {
      const onNavigate = jest.fn(); // fonction simulée
      const billsContainer = new Bills({
        document,
        onNavigate,
        store: null,
        localStorage: window.localStorage,
      });

      document.body.innerHTML = BillsUI({ data: [] }); // page vide pour éviter d'autres effets
      const buttonNewBill = screen.getByTestId("btn-new-bill");

      // on connecte le bouton à la méthode à tester
      buttonNewBill.addEventListener(
        "click",
        billsContainer.handleClickNewBill
      );

      // on déclenche le clic
      buttonNewBill.click();

      // on vérifie qu'on est redirigé vers NewBill
      expect(onNavigate).toHaveBeenCalledWith(ROUTES_PATH.NewBill);
    });

    test("Then clicking on eye icon should open modal", () => {
      document.body.innerHTML = BillsUI({ data: bills });

      const onNavigate = (pathname) => {
        document.body.innerHTML = ROUTES({ pathname });
      };

      const billsContainer = new Bills({
        document,
        onNavigate,
        store: null,
        localStorage: window.localStorage,
      });

      const eyeIcon = screen.getAllByTestId("icon-eye")[0];
      const mockHandleClickIconEye = jest.fn(billsContainer.handleClickIconEye);

      eyeIcon.addEventListener("click", () => mockHandleClickIconEye(eyeIcon));
      fireEvent.click(eyeIcon);

      expect(mockHandleClickIconEye).toHaveBeenCalled();
    });
    test("Then clicking on eye icon should open modal with the correct image", () => {
      $.fn.modal = jest.fn(); // mock jQuery modal

      document.body.innerHTML = BillsUI({ data: bills });

      const onNavigate = jest.fn();
      const billsContainer = new Bills({
        document,
        onNavigate,
        store: null,
        localStorage: window.localStorage,
      });

      const eyeIcon = screen.getAllByTestId("icon-eye")[0];

      fireEvent.click(eyeIcon);

      // ✅ Vérifie que la modale est bien affichée
      expect($.fn.modal).toHaveBeenCalledWith("show");

      // ✅ Vérifie que l'image dans la modale a bien le bon src
      const billUrl = eyeIcon.getAttribute("data-bill-url");
      const img = document.querySelector(".bill-proof-container img");
      expect(img).toBeTruthy();
      expect(img.src).toMatch(billUrl);
    });

    test("getBills() should return bills sorted and formatted", async () => {
      const billsContainer = new Bills({
        document,
        onNavigate: jest.fn(),
        store: mockStore,
        localStorage: window.localStorage,
      });

      const bills = await billsContainer.getBills();

      // ✅ Vérifie qu'on a bien le bon nombre
      expect(bills.length).toBeGreaterThan(0);

      // ✅ Vérifie que les bills sont bien triées par date descendante
      const rawDates = bills.map((bill) => bill.rawDate);
      const sortedDates = [...rawDates].sort(
        (a, b) => new Date(b) - new Date(a)
      );
      expect(rawDates).toEqual(sortedDates);

      // ✅ Vérifie que les dates sont bien formatées
      bills.forEach((bill) => {
        expect(bill.date).not.toBe(bill.rawDate);
      });
    });
    test("should return bills with raw date if formatDate throws an error", async () => {
      const billsWithBadDate = [
        {
          id: "bad-bill",
          date: "date-invalide", // ❌ va faire planter formatDate
          status: "pending",
          amount: 100,
          name: "Facture test",
          type: "Transport",
          fileUrl: "test.jpg",
          email: "employe@test.tld",
        },
      ];

      const store = {
        bills: () => ({
          list: () => Promise.resolve(billsWithBadDate),
        }),
      };

      const billsInstance = new Bills({
        document,
        onNavigate: jest.fn(),
        store,
        localStorage: window.localStorage,
      });

      const bills = await billsInstance.getBills();

      expect(bills[0].date).toBe("date-invalide"); // ✅ on est passé dans le catch
      expect(bills[0].status).toBe("En attente"); // formatStatus fonctionne
    });
  });
});
// test d'intégration GET
describe("Given I am connected as an employee", () => {
  describe("When I navigate to Bills", () => {
    test("fetches bills from mock API GET", async () => {
      // configuration du localStorage pour simuler un utilisateur employé
      Object.defineProperty(window, "localStorage", {
        value: localStorageMock,
      });
      window.localStorage.setItem(
        "user",
        JSON.stringify({ type: "Employee", email: "employee@test.tld" })
      );

      // Ajout du root pour le router
      const root = document.createElement("div");
      root.setAttribute("id", "root");
      document.body.append(root);
      router(); // appelle le router pour initialiser la page

      // navigation vers Bills
      window.onNavigate("/bills");

      // attend que la page charge
      await waitFor(() => screen.getByText("Mes notes de frais"));

      // attend que les icônes "oeil" (détails des notes de frais) soient visibles
      const iconEyes = await screen.findAllByTestId("icon-eye");
      expect(iconEyes).toBeTruthy(); // il y a au moins un oeil visible

      // vérifie qu'on a bien reçu toutes les factures mockées
      const rows = await screen.findAllByTestId("bill-row");
      expect(rows.length).toBe(bills.length); // compare le nombre de lignes reçues avec le mock
    });
  });
});
