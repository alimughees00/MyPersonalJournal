module.exports = {
  project: {
    ios: {},
    android: {},
  },
  dependency: {},
  commands: [],
  get link() {
    return [
      {
        ios: [
          {
            from: 'src/assets/fonts/',
            to: 'Fonts/',
          },
        ],
        android: [
          {
            from: 'src/assets/fonts/',
            to: 'app/src/main/assets/fonts/',
          },
        ],
      },
    ];
  },
};
