# Running UI scene with latest Bevy explorer dev version

- Run this scene with npm run start 
- Close bevy client
- Clone decentraland/bevy-explorer repo
- Follow README instructions from the decentraland/bevy-explorer repo to install and setup
- Compile and run bevy with following command:

``` cargo run  --release --bin decentra-bevy --features="console" -- --ui http://localhost:8000 --ui-preview --scene_log_to_console --server https://realm-provider-ea.decentraland.org/main --location 88,88 --log_fps false --no-perms --no-chat --no-profile --impost 100,200,400,800,1600,99999 --no-nametags```

OR if you are running a local scene replace server part with...
 ``` --server http://localhost:8001 ```

to run with genesis plaza...
```
cargo run --release --bin decentra-bevy  --features="console" -- --ui http://localhost:8000 --ui-preview --scene_log_to_console --server https://realm-provider-ea.decentraland.org/main --location 0,0
```

For more cli arg options check https://github.com/decentraland/bevy-explorer

# Feature Flags

Features can be disabled at runtime via the `disableFeatures` param, passed as a comma-separated list of feature names.

**Usage:**

- Desktop: `--params "disableFeatures=minimap,chat"`
- Web: `?disableFeatures=minimap,chat`

**Available features:**

| Feature | Default | Description |
|---|---|---|
| `minimap` | `true` | Minimap overlay |
| `chat` | `true` | Chat panel and sidebar button |
| `discoverMap` | `true` | Discover map (BigMap) and related sidebar buttons |
| `notifications` | `true` | Notification toasts and notification polling |
| `friends` | `true` | Friends panel and sidebar button |

When a feature is disabled, its UI elements are hidden and related background services (streams, polling) are not started.

**Code usage:**

```typescript
import { FEATURES, getFeatureFlag } from '../service/feature-flags'

if (getFeatureFlag(FEATURES.CHAT)) {
  // render chat UI
}
```

# Working and bundling texture spritesheets

We rename the names that come from figma file, and we change to names that make more sense from a programming point of view, for example, we rename HeadIcon to category-top_head, which for example it's the exact category id coming from API.
Or we rename Epic to rarity-background-epic to be more explicit, or Category-1 to rarity-corner-base, etc.

Then on this online tool, we can drag and drop all the png files https://www.codeandweb.com/tp-online
Then exporting the json and png sprite-sheet we can use those directly in our code, with all names and coords automatically set