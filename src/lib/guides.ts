export interface Guide {
    id: string;
    slug: string;
    title: string;
    description: string;
    content: string; // Markdown or HTML string for now
    author: string;
    publishedAt: string;
    updatedAt: string;
    image: string;
    tags: string[];
    qaList?: { question: string, answer: string }[];
}

export const guides: Guide[] = [
    {
        id: 'g1',
        slug: 'controlling-fall-armyworm-maize',
        title: 'How to Control Fall Armyworm in Maize (2026 Guide)',
        description: 'A complete, step-by-step protocol for identifying, managing, and eradicating Fall Armyworm in Kenyan maize farms.',
        author: 'Mel-Agri Agronomy Team',
        publishedAt: '2026-03-01T08:00:00Z',
        updatedAt: '2026-03-10T10:00:00Z',
        image: '/assets/blogs/armyworm.jpg',
        tags: ['Maize', 'Pest Control', 'Armyworm'],
        qaList: [
            { question: "What is the best pesticide for Fall Armyworm in Kenya?", answer: "We recommend a combination of contact and systemic insecticides such as Coragen or Radiant, applied at the first sign of window-pane damage on leaves." },
            { question: "When should I spray for Fall Armyworm?", answer: "Spray early in the morning or late in the evening when the larvae are actively feeding outside the whorl." }
        ],
        content: `
## Identifying Fall Armyworm (FAW)
The Fall Armyworm (*Spodoptera frugiperda*) is a devastating pest in Kenya. Look for:
- "Window-pane" feeding marks on young leaves.
- Frass (sawdust-like excrement) in the maize whorl.
- The caterpillar itself, which has an inverted "Y" shape on its head and four spots arranged in a square on its second-to-last segment.

## Chemical Control Specifications

| Product | Active Ingredient | Application Rate | Best Time to Apply |
|---------|-------------------|------------------|--------------------|
| Coragen | Chlorantraniliprole| 3ml / 20L water  | Early morning      |
| Radiant | Spinetoram        | 10ml / 20L water | Late evening       |
| Belt    | Flubendiamide     | 5ml / 20L water  | Early morning      |

## Biological Control Methods
For organic farmers or as part of IPM (Integrated Pest Management):
1.  **Push-Pull Technology**: Planting Desmodium between maize rows and Napier grass around the field borders.
2.  **Ash Application**: Applying wood ash or sand directly into the funnel of the maize plant can suffocate young larvae.
        `
    },
    {
        id: 'g2',
        slug: 'best-fertilizer-for-tomatoes-short-rains',
        title: 'Best Fertilizer for Tomatoes During the Short Rains',
        description: 'Maximize your tomato yield this season by choosing the perfect blend of basal and top-dressing fertilizers.',
        author: 'Mel-Agri Agronomy Team',
        publishedAt: '2026-02-15T08:00:00Z',
        updatedAt: '2026-02-15T08:00:00Z',
        image: '/assets/blogs/tomatoes.jpg',
        tags: ['Tomatoes', 'Fertilizer', 'Short Rains'],
        qaList: [
            { question: "Should I use DAP or NPK for planting tomatoes?", answer: "For planting, NPK 17:17:17 or NPK 23:23:0 is better than standard DAP because tomatoes need Potassium (K) early on for root development and disease resistance." },
            { question: "When do I top-dress my tomato plants?", answer: "Top-dress with CAN (Calcium Ammonium Nitrate) 3-4 weeks after transplanting to boost vegetative growth and prevent Blossom End Rot." }
        ],
        content: `
## The Importance of the Right Fertilizer for Tomatoes
Tomatoes are heavy feeders. During the short rains in Kenya, leaching of nutrients is common, making targeted fertilizer application critical.

### Basal Application (Planting)
We highly recommend using an NPK blend rather than just DAP. 
- **Why?** Potassium is vital for fruit quality and disease resistance, especially in wet conditions where blight thrives.
- **Recommended:** NPK 17:17:17 at a rate of 10g per hole.

### Top Dressing Schedule

| Stage | Weeks after Transplanting | Fertilizer Type | Rate per Plant |
|-------|---------------------------|-----------------|----------------|
| Vegetative Phase | 3 - 4 weeks | CAN (Calcium Ammonium Nitrate) | 10g |
| Flowering Phase | 6 - 8 weeks | NPK 17:17:17 or YaraMila Winner | 10g |
| Fruiting Phase | 10+ weeks | Potassium Nitrate (Foliar feed) | 50g / 20L |

### Preventing Blossom End Rot
A common issue during erratic rains is Blossom End Rot (the black rotting at the bottom of the tomato). This is caused by **Calcium deficiency**. Using CAN for top dressing is the best preventative measure because it supplies both Nitrogen and Calcium.
        `
    }
];

export async function getGuides(): Promise<Guide[]> {
    // Simulating async fetch, eventually this could be pulled from Firestore
    return guides;
}

export async function getGuideBySlug(slug: string): Promise<Guide | null> {
    const guide = guides.find(g => g.slug === slug);
    return guide || null;
}
