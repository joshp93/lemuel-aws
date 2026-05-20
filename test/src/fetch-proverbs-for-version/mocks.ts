export const VERSE_MOCK = [
  {
    name: "para",
    type: "tag",
    attrs: {
      style: "q2",
    },
    items: [
      {
        name: "verse",
        type: "tag",
        attrs: {
          number: "3",
          style: "v",
          sid: "PRO 10:3",
        },
        items: [
          {
            text: "3",
            type: "text",
          },
        ],
      },
      {
        text: "The ",
        type: "text",
        attrs: {
          verseId: "PRO.10.3",
          verseOrgIds: ["PRO.10.3"],
        },
      },
      {
        name: "char",
        type: "tag",
        attrs: {
          style: "sc",
        },
        items: [
          {
            text: "Lord",
            type: "text",
            attrs: {
              verseId: "PRO.10.3",
              verseOrgIds: ["PRO.10.3"],
            },
          },
        ],
      },
      {
        text: " will not allow the righteous soul to famish,",
        type: "text",
        attrs: {
          verseId: "PRO.10.3",
          verseOrgIds: ["PRO.10.3"],
        },
      },
    ],
  },
  {
    name: "para",
    type: "tag",
    attrs: {
      style: "q2",
      vid: "PRO 10:3",
    },
    items: [
      {
        text: "But He casts away the desire of the wicked.",
        type: "text",
        attrs: {
          verseId: "PRO.10.3",
          verseOrgIds: ["PRO.10.3"],
        },
      },
    ],
  },
];
