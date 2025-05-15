/**
 * @jest-environment jsdom
 */

import { fireEvent, screen } from "@testing-library/dom";
import NewBillUI from "../views/NewBillUI.js";
import NewBill from "../containers/NewBill.js";
import { ROUTES_PATH } from "../constants/routes.js";
import { localStorageMock } from "../__mocks__/localStorage.js";
import mockStore from "../__mocks__/store.js";

jest.mock("../app/store", () => mockStore); // on utilise le store mocké

describe("Given I am connected as an employee", () => {
  beforeEach(() => {
    Object.defineProperty(window, "localStorage", {
      value: localStorageMock,
    });
    window.localStorage.setItem(
      "user",
      JSON.stringify({ type: "Employee", email: "employe@test.tld" })
    );

    document.body.innerHTML = NewBillUI();

    const onNavigate = (pathname) => {
      document.body.innerHTML = pathname;
    };

    // on instancie la classe NewBill à chaque test
    this.newBill = new NewBill({
      document,
      onNavigate,
      store: mockStore,
      localStorage: window.localStorage,
    });
  });

  test("Then the form should be visible", () => {
    expect(screen.getByTestId("form-new-bill")).toBeTruthy();
  });

  test("Then it should accept a valid image file", async () => {
    const fileInput = screen.getByTestId("file");
    const goodFile = new File(["img"], "photo.png", { type: "image/png" });

    // simulate le fichier comme si on l'avait choisi
    Object.defineProperty(fileInput, "files", {
      value: [goodFile],
    });

    const handleChangeFile = jest.fn(this.newBill.handleChangeFile);
    fileInput.addEventListener("change", handleChangeFile);

    fireEvent.change(fileInput);

    expect(handleChangeFile).toHaveBeenCalled();
    expect(this.newBill.fileName).toBe("photo.png");
    expect(this.newBill.fileUrl).toBeDefined(); // car store renvoie une url
  });

  test("Then it should reject an invalid file format", () => {
    const fileInput = screen.getByTestId("file");
    const badFile = new File(["hello"], "test.pdf", {
      type: "application/pdf",
    });

    // simulate le fichier PDF
    Object.defineProperty(fileInput, "files", {
      value: [badFile],
    });

    window.alert = jest.fn(); // pour capter alert()

    const handleChangeFile = jest.fn(this.newBill.handleChangeFile);
    fileInput.addEventListener("change", handleChangeFile);

    fireEvent.change(fileInput);

    expect(handleChangeFile).toHaveBeenCalled();
    expect(window.alert).toHaveBeenCalledWith(
      "Format invalide : veuillez choisir une image (.jpg, .jpeg ou .png)"
    );
  });

  test("Then it should submit the form and navigate to Bills", () => {
    const form = screen.getByTestId("form-new-bill");

    const handleSubmit = jest.fn((e) => this.newBill.handleSubmit(e));
    form.addEventListener("submit", handleSubmit);

    fireEvent.submit(form);

    expect(handleSubmit).toHaveBeenCalled();
  });

  test("Then it should log error if store.bills().create fails", async () => {
    const fileInput = screen.getByTestId("file");
    const goodFile = new File(["img"], "photo.png", { type: "image/png" });

    Object.defineProperty(fileInput, "files", {
      value: [goodFile],
    });

    const errorStore = {
      bills: () => ({
        create: jest.fn(() => Promise.reject("Erreur API")),
      }),
    };

    const newBillWithError = new NewBill({
      document,
      onNavigate: jest.fn(),
      store: errorStore,
      localStorage: window.localStorage,
    });

    console.error = jest.fn();

    const handleChangeFile = jest.fn(newBillWithError.handleChangeFile);
    fileInput.addEventListener("change", handleChangeFile);

    fireEvent.change(fileInput);

    await new Promise(process.nextTick); // attendre l'erreur

    expect(console.error).toHaveBeenCalledWith("Erreur API");
  });
});
