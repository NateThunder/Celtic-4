export const ABOUT_PHOTOS = "/photos/about";

export type HeroFrame = {
  src: string;
  /** CSS object-position for this crop. */
  position: string;
};

export type Member = {
  name: string;
  instrument: string;
  frames: HeroFrame[];
};

/** The seven, in hero-strip order (left to right). */
export const MEMBERS: Member[] = [
  {
    name: "Mhairi Marwick",
    instrument: "Fiddle",
    frames: [
      { src: `${ABOUT_PHOTOS}/hero/mhairi-marwick-01.jpg`, position: "31% 28%" },
      { src: `${ABOUT_PHOTOS}/hero/mhairi-marwick-02.jpg`, position: "50% 34%" },
      { src: `${ABOUT_PHOTOS}/hero/mhairi-marwick-03.jpg`, position: "50% 26%" },
    ],
  },
  {
    name: "Chris Amer",
    instrument: "Guitars",
    frames: [
      { src: `${ABOUT_PHOTOS}/hero/chris-amer-01.jpg`, position: "44% 26%" },
      { src: `${ABOUT_PHOTOS}/hero/chris-amer-02.jpg`, position: "52% 26%" },
      { src: `${ABOUT_PHOTOS}/hero/chris-amer-03.jpg`, position: "58% 22%" },
    ],
  },
  {
    name: "Gus Stirrat",
    instrument: "Bass",
    frames: [
      { src: `${ABOUT_PHOTOS}/hero/gus-stirrat-01.jpg`, position: "54% 26%" },
      { src: `${ABOUT_PHOTOS}/hero/gus-stirrat-02.jpg`, position: "40% 10%" },
      { src: `${ABOUT_PHOTOS}/hero/gus-stirrat-03.jpg`, position: "40% 18%" },
      { src: `${ABOUT_PHOTOS}/hero/gus-stirrat-04.jpg`, position: "54% 30%" },
    ],
  },
  {
    name: "Naomi Stirrat",
    instrument: "Vocals & Guitar",
    frames: [
      { src: `${ABOUT_PHOTOS}/hero/naomi-stirrat-01.jpg`, position: "52% 28%" },
      { src: `${ABOUT_PHOTOS}/hero/naomi-stirrat-02.jpg`, position: "48% 26%" },
      { src: `${ABOUT_PHOTOS}/hero/naomi-stirrat-03.jpg`, position: "48% 26%" },
    ],
  },
  {
    name: "Calum MacAskill",
    instrument: "Pipes",
    frames: [
      { src: `${ABOUT_PHOTOS}/hero/calum-macaskill-01.jpg`, position: "50% 24%" },
      { src: `${ABOUT_PHOTOS}/hero/calum-macaskill-02.jpg`, position: "54% 26%" },
      { src: `${ABOUT_PHOTOS}/hero/calum-macaskill-03.jpg`, position: "40% 16%" },
    ],
  },
  {
    name: "David Hogg",
    instrument: "Vocals & Guitar",
    frames: [
      { src: `${ABOUT_PHOTOS}/hero/david-hogg-01.jpg`, position: "34% 22%" },
      { src: `${ABOUT_PHOTOS}/hero/david-hogg-02.jpg`, position: "52% 24%" },
      { src: `${ABOUT_PHOTOS}/hero/david-hogg-03.jpg`, position: "60% 24%" },
    ],
  },
  {
    name: "Ifedade Thomas",
    instrument: "Drums",
    frames: [
      { src: `${ABOUT_PHOTOS}/hero/ifedade-thomas-01.jpg`, position: "50% 22%" },
      { src: `${ABOUT_PHOTOS}/hero/ifedade-thomas-02.jpg`, position: "62% 12%" },
      { src: `${ABOUT_PHOTOS}/hero/ifedade-thomas-03.jpg`, position: "70% 30%" },
    ],
  },
];
