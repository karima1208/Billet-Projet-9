module.exports = {
  presets: [
    [
      "@babel/preset-env",
      {
        targets: {
          node: "current",
        },
      },
    ],
  ],

  plugins: [
    "@babel/plugin-proposal-class-properties", // Ajout du plugin pour les propriétés de classe
  ],
};
