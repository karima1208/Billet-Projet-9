/**
 * @jest-environment jsdom
 */

import "@testing-library/jest-dom";
import { fireEvent, screen, waitFor } from "@testing-library/dom";
import NewBillUI from "../views/NewBillUI.js";
import NewBill from "../containers/NewBill.js";
import { ROUTES_PATH } from "../constants/routes";
import { localStorageMock } from "../__mocks__/localStorage.js";
import mockStore from "../__mocks__/store";
import router from "../app/Router.js";

jest.mock("../app/Store", () => mockStore);

global.MutationObserver = class {
  constructor(callback) {}
  disconnect() {}
  observe(element, initObject) {}
};

describe("Given I am connected as an employee", () => {
  beforeEach(() => {
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
    window.onNavigate(ROUTES_PATH.NewBill);
  });
  // Vérifie que le formulaire de nouvelle note de frais s'affiche correctement
  describe("When I am on NewBill Page", () => {
    test("Then it should display the form for creating a new bill", () => {
      const html = NewBillUI();
      document.body.innerHTML = html;
      const formElement = screen.getByTestId("form-new-bill");
      expect(formElement).toBeInTheDocument(); // ce que j'ai ajouté
    });
    // Vérifie que l'import d'un fichier avec une extension valide fonctionne
    describe("When I Upload a valid extension", () => {
      test("Then file  upload is valid", async () => {
        document.body.innerHTML = NewBillUI();
        const file = new File(["Test image"], "testImage.jpg", {
          type: "image/png",
        }); // simuler le fichier que l'utilisateur va importer
        const input = screen.getByTestId("file");
        const preventDefault = jest.fn();
        const event = {
          preventDefault,
          target: { files: [file] },
        };

        const newBill = new NewBill({
          document,
          onNavigate,
          store: mockStore,
          localStorage,
        });

        const mockHandleChangeFile = jest.fn((e) => {
          newBill.handleChangeFile(e);
        });
        input.addEventListener("change", mockHandleChangeFile);

        await waitFor(() => fireEvent.change(input, event));

        expect(newBill.fileName).toBe("testImage.jpg");
        expect(mockHandleChangeFile).toHaveBeenCalled();
      });
    });
    // Vérifie que l'import d'un fichier avec une extension non autorisée est rejeté
    describe("When I Upload a invalid extension", () => {
      test("Then file upload is invalid", async () => {
        document.body.innerHTML = NewBillUI();
        const file = new File(["Test json file"], "testFile.json", {
          type: "application/json",
        });
        const input = screen.getByTestId("file");
        const preventDefault = jest.fn();
        const windowAlertMock = jest.fn();
        window.alert = windowAlertMock;
        const event = {
          preventDefault,
          target: { files: [file] },
        };

        const newBill = new NewBill({
          document,
          onNavigate,
          store: mockStore,
          localStorage,
        });

        const mockHandleChangeFile = jest.fn((e) => {
          newBill.handleChangeFile(event);
        });
        input.addEventListener("change", mockHandleChangeFile); // on ajoute un eventListner
        fireEvent.change(input, event); // on simule l'envent

        expect(mockHandleChangeFile).toHaveBeenCalled();
        expect(windowAlertMock).toBeCalled();
      });
    });
    // Vérifie que la fonction handleSubmit est bien appelée lors de la soumission du formulaire
    describe("And submit form", () => {
      test("Then handle submit should be called", () => {
        document.body.innerHTML = NewBillUI();
        const newBill = new NewBill({
          document,
          onNavigate,
          store: null,
          localStorage,
        });

        const handleSubmit = jest.fn((e) => newBill.handleSubmit(e)); // on a mocké la fct handlesumbit
        const formNewBill = screen.getByTestId("form-new-bill");
        formNewBill.addEventListener("submit", handleSubmit);

        fireEvent.submit(formNewBill);
        expect(handleSubmit).toHaveBeenCalled();
      });
    });
  });
});

// Test d'intégration : vérifie le comportement de l'application en cas d'erreur API lors de la création d'une note de frais
describe("When an error occurs on API", () => {
  beforeEach(() => {
    // Mock du DOM
    const root = document.createElement("div");
    root.setAttribute("id", "root");
    document.body.appendChild(root);
    router();

    // Mock de console.error
    jest.spyOn(console, "error").mockImplementation(() => {});
  });

  afterEach(() => {
    console.error.mockRestore();
    document.body.innerHTML = ""; // Nettoyage du DOM
  });

  const errors = [
    { code: 404, message: "Erreur 404" },
    { code: 500, message: "Erreur 500" },
  ];

  describe.each(errors)("Then it fails with a $code error", ({ message }) => {
    test(`It should log "${message}"`, async () => {
      // Simule l'erreur côté store
      const error = new Error(message);
      mockStore.bills().create = jest.fn().mockRejectedValue(error);

      // Navigation vers la page NewBill
      window.onNavigate(ROUTES_PATH.NewBill);

      const newBill = new NewBill({
        document,
        onNavigate,
        store: mockStore,
        localStorage: window.localStorage,
      });

      // Simulation de la soumission du formulaire
      const form = screen.getByTestId("form-new-bill");
      const handleSubmit = jest.fn((e) => newBill.handleSubmit(e));
      form.addEventListener("submit", handleSubmit);

      await fireEvent.submit(form);

      // Vérifie que le handler est appelé
      expect(handleSubmit).toHaveBeenCalled();

      // Vérifie que console.error a été appelé avec l'erreur
      expect(console.error).toHaveBeenCalledWith(error);
    });
  });
});
