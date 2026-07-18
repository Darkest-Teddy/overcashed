"use client";

import { memo, Suspense, useMemo, useRef } from "react";
import type { RefObject } from "react";
import type { FurnitureItem, RenderAgent } from "@/features/retro-office/core/types";
import { FloorAndWalls, WallPictures } from "@/features/retro-office/scene/environment";
import {
  FurnitureModel as GenericFurnitureModel,
  InstancedFurnitureItems as InstancedFurnitureItemsModel,
} from "@/features/retro-office/objects/furniture";
import { JukeboxModel as InteractiveJukeboxModel } from "@/features/retro-office/objects/Jukebox";
import {
  DishwasherModel as KitchenDishwasherModel,
  MicrowaveModel as KitchenMicrowaveModel,
  SinkModel as KitchenSinkModel,
  StoveModel as KitchenStoveModel,
  VendingMachineModel as KitchenVendingMachineModel,
  WallCabinetModel as KitchenWallCabinetModel,
} from "@/features/retro-office/objects/kitchen";
import {
  AtmMachineModel as InteractiveAtmMachineModel,
  DeviceRackModel as InteractiveDeviceRackModel,
  DumbbellRackModel as InteractiveDumbbellRackModel,
  ExerciseBikeModel as InteractiveExerciseBikeModel,
  KettlebellRackModel as InteractiveKettlebellRackModel,
  PingPongTableModel as MachinePingPongTableModel,
  PhoneBoothModel as InteractivePhoneBoothModel,
  PunchingBagModel as InteractivePunchingBagModel,
  QaTerminalModel as InteractiveQaTerminalModel,
  RowingMachineModel as InteractiveRowingMachineModel,
  ServerRackModel as InteractiveServerRackModel,
  ServerTerminalModel as InteractiveServerTerminalModel,
  SmsBoothModel as InteractiveSmsBoothModel,
  TestBenchModel as InteractiveTestBenchModel,
  TreadmillModel as InteractiveTreadmillModel,
  WeightBenchModel as InteractiveWeightBenchModel,
  YogaMatModel as InteractiveYogaMatModel,
} from "@/features/retro-office/objects/machines";
import {
  ClockModel as PrimitiveClockModel,
  DoorModel as PrimitiveDoorModel,
  InstancedWallSegmentsModel as PrimitiveInstancedWallSegmentsModel,
  KeyboardModel as PrimitiveKeyboardModel,
  MouseModel as PrimitiveMouseModel,
  MugModel as PrimitiveMugModel,
  RoundTableModel as PrimitiveRoundTableModel,
  TrashCanModel as PrimitiveTrashCanModel,
} from "@/features/retro-office/objects/primitives";

const noop = () => {};

// Renders the office exactly like RetroOffice3D's read-only (non-edit) scene,
// but decoupled from the agent runtime. `furniture` is the same layout the
// original app builds. Interactive/edit affordances are stubbed out.
export const OfficeWorld = memo(function OfficeWorld({
  furniture,
}: {
  furniture: FurnitureItem[];
}) {
  // Doors read agent positions to auto-open; players aren't in this ref, so
  // pass an empty one (doors simply stay closed, and are passable anyway).
  const emptyAgentsRef = useRef<RenderAgent[]>([]) as RefObject<RenderAgent[]>;

  const wallItems = useMemo(
    () => furniture.filter((i) => i.type === "wall"),
    [furniture],
  );
  const deskItems = useMemo(
    () => furniture.filter((i) => i.type === "desk_cubicle"),
    [furniture],
  );
  const chairItems = useMemo(
    () => furniture.filter((i) => i.type === "chair"),
    [furniture],
  );

  return (
    <group>
      <FloorAndWalls showRemoteOffice={false} />
      <WallPictures showRemoteOffice={false} />

      <Suspense fallback={null}>
        <PrimitiveInstancedWallSegmentsModel items={wallItems} />
        <InstancedFurnitureItemsModel itemType="desk_cubicle" items={deskItems} />
        <InstancedFurnitureItemsModel itemType="chair" items={chairItems} />

        {furniture.map((item) => {
          // Instanced above; skip individual meshes in read-only mode.
          if (item.type === "wall" || item.type === "desk_cubicle" || item.type === "chair") {
            return null;
          }
          const common = {
            item,
            isSelected: false,
            isHovered: false,
            editMode: false,
            onPointerDown: noop,
            onPointerOver: noop,
            onPointerOut: noop,
            onClick: noop,
          } as const;

          switch (item.type) {
            case "door":
              return (
                <PrimitiveDoorModel
                  key={item._uid}
                  item={item}
                  isSelected={false}
                  isHovered={false}
                  editMode={false}
                  agentsRef={emptyAgentsRef}
                  onPointerDown={noop}
                  onPointerOver={noop}
                  onPointerOut={noop}
                />
              );
            case "round_table":
              return <PrimitiveRoundTableModel key={item._uid} {...common} />;
            case "keyboard":
              return (
                <PrimitiveKeyboardModel key={item._uid} item={item} editMode={false} onPointerDown={noop} onPointerOver={noop} onPointerOut={noop} />
              );
            case "mouse":
              return (
                <PrimitiveMouseModel key={item._uid} item={item} editMode={false} onPointerDown={noop} onPointerOver={noop} onPointerOut={noop} />
              );
            case "trash":
              return (
                <PrimitiveTrashCanModel key={item._uid} item={item} editMode={false} onPointerDown={noop} onPointerOver={noop} onPointerOut={noop} />
              );
            case "mug":
              return (
                <PrimitiveMugModel key={item._uid} item={item} editMode={false} onPointerDown={noop} onPointerOver={noop} onPointerOut={noop} />
              );
            case "clock":
              return (
                <PrimitiveClockModel key={item._uid} item={item} editMode={false} onPointerDown={noop} onPointerOver={noop} onPointerOut={noop} />
              );
            case "atm":
              return <InteractiveAtmMachineModel key={item._uid} {...common} />;
            case "jukebox":
              return (
                <InteractiveJukeboxModel
                  key={item._uid}
                  item={item}
                  active={false}
                  enabled={false}
                  isSelected={false}
                  isHovered={false}
                  editMode={false}
                  onPointerDown={noop}
                  onPointerOver={noop}
                  onPointerOut={noop}
                  onClick={noop}
                />
              );
            case "sms_booth":
              return <InteractiveSmsBoothModel key={item._uid} {...common} doorOpen={false} />;
            case "phone_booth":
              return <InteractivePhoneBoothModel key={item._uid} {...common} doorOpen={false} />;
            case "server_rack":
              return <InteractiveServerRackModel key={item._uid} {...common} />;
            case "server_terminal":
              return <InteractiveServerTerminalModel key={item._uid} {...common} />;
            case "vending":
              return (
                <KitchenVendingMachineModel key={item._uid} item={item} editMode={false} onPointerDown={noop} onPointerOver={noop} onPointerOut={noop} />
              );
            case "sink":
              return (
                <KitchenSinkModel key={item._uid} item={item} editMode={false} onPointerDown={noop} onPointerOver={noop} onPointerOut={noop} />
              );
            case "dishwasher":
              return (
                <KitchenDishwasherModel key={item._uid} item={item} editMode={false} onPointerDown={noop} onPointerOver={noop} onPointerOut={noop} />
              );
            case "pingpong":
              return <MachinePingPongTableModel key={item._uid} {...common} />;
            case "qa_terminal":
              return <InteractiveQaTerminalModel key={item._uid} {...common} />;
            case "device_rack":
              return <InteractiveDeviceRackModel key={item._uid} {...common} />;
            case "test_bench":
              return <InteractiveTestBenchModel key={item._uid} {...common} />;
            case "treadmill":
              return <InteractiveTreadmillModel key={item._uid} {...common} />;
            case "weight_bench":
              return <InteractiveWeightBenchModel key={item._uid} {...common} />;
            case "dumbbell_rack":
              return <InteractiveDumbbellRackModel key={item._uid} {...common} />;
            case "exercise_bike":
              return <InteractiveExerciseBikeModel key={item._uid} {...common} />;
            case "rowing_machine":
              return <InteractiveRowingMachineModel key={item._uid} {...common} />;
            case "kettlebell_rack":
              return <InteractiveKettlebellRackModel key={item._uid} {...common} />;
            case "punching_bag":
              return <InteractivePunchingBagModel key={item._uid} {...common} />;
            case "yoga_mat":
              return <InteractiveYogaMatModel key={item._uid} {...common} />;
            case "stove":
              return (
                <KitchenStoveModel key={item._uid} item={item} editMode={false} onPointerDown={noop} onPointerOver={noop} onPointerOut={noop} />
              );
            case "microwave":
              return (
                <KitchenMicrowaveModel key={item._uid} item={item} editMode={false} onPointerDown={noop} onPointerOver={noop} onPointerOut={noop} />
              );
            case "wall_cabinet":
              return (
                <KitchenWallCabinetModel key={item._uid} item={item} editMode={false} onPointerDown={noop} onPointerOver={noop} onPointerOut={noop} />
              );
            default:
              return <GenericFurnitureModel key={item._uid} {...common} />;
          }
        })}
      </Suspense>
    </group>
  );
});
