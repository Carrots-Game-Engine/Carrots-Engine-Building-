/*
 * GDevelop Core
 * Copyright 2008-2016 Florian Rival (Florian.Rival@gmail.com). All rights
 * reserved. This project is released under the MIT License.
 */
/**
 * @file Regression tests for project serialization parameter stability.
 */

#include <algorithm>
#include <vector>

#include "DummyPlatform.h"
#include "GDCore/Events/Builtin/StandardEvent.h"
#include "GDCore/Events/Event.h"
#include "GDCore/Events/EventsList.h"
#include "GDCore/Extensions/Platform.h"
#include "GDCore/Project/EventsBasedBehavior.h"
#include "GDCore/Project/EventsBasedObject.h"
#include "GDCore/Project/EventsFunctionsExtension.h"
#include "GDCore/Project/ExternalEvents.h"
#include "GDCore/Project/Layout.h"
#include "GDCore/Project/Object.h"
#include "GDCore/Project/ObjectsContainer.h"
#include "GDCore/Project/Project.h"
#include "GDCore/Project/PropertyDescriptor.h"
#include "GDCore/Serialization/SerializerElement.h"
#include "catch.hpp"

namespace {
struct ProjectSnapshot {
  std::vector<gd::String> instructionEntries;
  std::vector<gd::String> behaviorPropertyEntries;
};

gd::Instruction MakeInstruction(const gd::String& type,
                                const std::vector<gd::String>& parameters) {
  gd::Instruction instruction;
  instruction.SetType(type);
  instruction.SetParametersCount(parameters.size());
  for (std::size_t i = 0; i < parameters.size(); ++i) {
    instruction.SetParameter(i, gd::Expression(parameters[i]));
  }
  return instruction;
}

void AddParameterizedStandardEvent(gd::EventsList& events,
                                   const gd::String& numberVariableName,
                                   const gd::String& stringVariableName,
                                   const gd::String& booleanVariableName,
                                   const gd::String& objectName,
                                   const gd::String& suffix,
                                   const gd::String& numberLiteral) {
  auto standardEvent = std::make_shared<gd::StandardEvent>();
  standardEvent->SetType("BuiltinCommonInstructions::Standard");

  const gd::String conditionStringLiteral = "\"ConditionText" + suffix + "\"";
  const gd::String actionStringLiteral = "\"ActionText" + suffix + "\"";

  standardEvent->GetConditions().Insert(
      MakeInstruction("NumberVariable", {numberVariableName, ">", numberLiteral}));
  standardEvent->GetConditions().Insert(
      MakeInstruction("StringVariable",
                      {stringVariableName, "=", conditionStringLiteral}));
  standardEvent->GetConditions().Insert(
      MakeInstruction("BooleanVariable", {booleanVariableName, "True", "False"}));

  standardEvent->GetActions().Insert(
      MakeInstruction("SetNumberVariable", {numberVariableName, "+", "7"}));
  standardEvent->GetActions().Insert(
      MakeInstruction("SetStringVariable",
                      {stringVariableName, "=", actionStringLiteral}));
  standardEvent->GetActions().Insert(MakeInstruction(
      "MyExtension::DoSomethingWithObjects", {objectName, objectName}));

  events.InsertEvent(standardEvent, events.GetEventsCount());
}

void AppendInstructionEntries(const gd::InstructionsList& instructions,
                              const gd::String& context,
                              std::vector<gd::String>& entries) {
  for (std::size_t i = 0; i < instructions.size(); ++i) {
    const auto& instruction = instructions[i];
    gd::String entry =
        context + "/instruction" + gd::String::From(i) + ":" +
        instruction.GetType() + "|inverted=" +
        gd::String::From(instruction.IsInverted() ? 1 : 0) + "|awaited=" +
        gd::String::From(instruction.IsAwaited() ? 1 : 0);

    for (std::size_t p = 0; p < instruction.GetParametersCount(); ++p) {
      entry += "|p" + gd::String::From(p) + "=" +
               instruction.GetParameter(p).GetPlainString();
    }

    entries.push_back(entry);

    if (!instruction.GetSubInstructions().empty()) {
      AppendInstructionEntries(instruction.GetSubInstructions(),
                               context + "/instruction" + gd::String::From(i) +
                                   "/subInstructions",
                               entries);
    }
  }
}

void AppendEventEntries(const gd::EventsList& events,
                        const gd::String& context,
                        std::vector<gd::String>& entries) {
  for (std::size_t i = 0; i < events.GetEventsCount(); ++i) {
    const auto& event = events.GetEvent(i);
    const gd::String eventContext =
        context + "/event" + gd::String::From(i) + ":" + event.GetType();

    const auto allConditions = event.GetAllConditionsVectors();
    for (std::size_t c = 0; c < allConditions.size(); ++c) {
      AppendInstructionEntries(*allConditions[c],
                               eventContext + "/conditions" +
                                   gd::String::From(c),
                               entries);
    }

    const auto allActions = event.GetAllActionsVectors();
    for (std::size_t a = 0; a < allActions.size(); ++a) {
      AppendInstructionEntries(
          *allActions[a], eventContext + "/actions" + gd::String::From(a), entries);
    }

    if (event.CanHaveSubEvents()) {
      AppendEventEntries(
          event.GetSubEvents(), eventContext + "/subEvents", entries);
    }
  }
}

void AppendBehaviorPropertyEntries(const gd::ObjectsContainer& objectsContainer,
                                   const gd::String& context,
                                   std::vector<gd::String>& entries) {
  for (std::size_t i = 0; i < objectsContainer.GetObjectsCount(); ++i) {
    const auto& object = objectsContainer.GetObject(i);
    auto behaviorNames = object.GetAllBehaviorNames();
    std::sort(behaviorNames.begin(), behaviorNames.end());

    for (const auto& behaviorName : behaviorNames) {
      const auto& behavior = object.GetBehavior(behaviorName);
      const auto behaviorProperties = behavior.GetProperties();
      for (const auto& property : behaviorProperties) {
        entries.push_back(
            context + "/object:" + object.GetName() + "/behavior:" +
            behaviorName + "/property:" + property.first + "=" +
            property.second.GetValue());
      }
    }
  }
}

ProjectSnapshot CaptureProjectSnapshot(const gd::Project& project) {
  ProjectSnapshot snapshot;

  AppendBehaviorPropertyEntries(
      project.GetObjects(), "project/globalObjects", snapshot.behaviorPropertyEntries);

  for (std::size_t i = 0; i < project.GetLayoutsCount(); ++i) {
    const auto& layout = project.GetLayout(i);
    const gd::String layoutContext =
        "project/layout:" + layout.GetName();
    AppendEventEntries(layout.GetEvents(), layoutContext, snapshot.instructionEntries);
    AppendBehaviorPropertyEntries(layout.GetObjects(),
                                  layoutContext + "/objects",
                                  snapshot.behaviorPropertyEntries);
  }

  for (std::size_t i = 0; i < project.GetExternalEventsCount(); ++i) {
    const auto& externalEvents = project.GetExternalEvents(i);
    AppendEventEntries(externalEvents.GetEvents(),
                       "project/externalEvents:" + externalEvents.GetName(),
                       snapshot.instructionEntries);
  }

  for (std::size_t i = 0; i < project.GetEventsFunctionsExtensionsCount(); ++i) {
    const auto& extension = project.GetEventsFunctionsExtension(i);
    const gd::String extensionContext =
        "project/extension:" + extension.GetName();

    for (std::size_t f = 0; f < extension.GetEventsFunctions().GetEventsFunctionsCount();
         ++f) {
      const auto& function = extension.GetEventsFunctions().GetEventsFunction(f);
      AppendEventEntries(function.GetEvents(),
                         extensionContext + "/function:" + function.GetName(),
                         snapshot.instructionEntries);
    }

    for (std::size_t b = 0;
         b < extension.GetEventsBasedBehaviors().GetCount();
         ++b) {
      const auto& eventsBasedBehavior = extension.GetEventsBasedBehaviors().Get(b);
      const gd::String behaviorContext =
          extensionContext + "/eventsBasedBehavior:" + eventsBasedBehavior.GetName();
      for (std::size_t f = 0;
           f < eventsBasedBehavior.GetEventsFunctions().GetEventsFunctionsCount();
           ++f) {
        const auto& function =
            eventsBasedBehavior.GetEventsFunctions().GetEventsFunction(f);
        AppendEventEntries(function.GetEvents(),
                           behaviorContext + "/function:" + function.GetName(),
                           snapshot.instructionEntries);
      }
    }

    for (std::size_t o = 0;
         o < extension.GetEventsBasedObjects().GetCount();
         ++o) {
      const auto& eventsBasedObject = extension.GetEventsBasedObjects().Get(o);
      const gd::String objectContext =
          extensionContext + "/eventsBasedObject:" + eventsBasedObject.GetName();
      for (std::size_t f = 0;
           f < eventsBasedObject.GetEventsFunctions().GetEventsFunctionsCount();
           ++f) {
        const auto& function =
            eventsBasedObject.GetEventsFunctions().GetEventsFunction(f);
        AppendEventEntries(function.GetEvents(),
                           objectContext + "/function:" + function.GetName(),
                           snapshot.instructionEntries);
      }

      AppendBehaviorPropertyEntries(eventsBasedObject.GetObjects(),
                                    objectContext + "/childObjects",
                                    snapshot.behaviorPropertyEntries);
    }
  }

  return snapshot;
}

void SetUnknownVersion(gd::SerializerElement& projectElement) {
  auto& versionElement = projectElement.GetChild("gdVersion");
  versionElement.SetAttribute("major", 0);
  versionElement.SetAttribute("minor", 0);
  versionElement.SetAttribute("build", 0);
  versionElement.SetAttribute("revision", 0);
}

void SetupProjectForParameterDriftRegression(gd::Project& project,
                                             gd::Platform& platform) {
  SetupProjectWithDummyPlatform(project, platform);

  auto& layout = project.InsertNewLayout("Scene", 0);
  auto& object =
      layout.GetObjects().InsertNewObject(project, "MyExtension::Sprite", "Player", 0);

  auto* customBehavior =
      object.AddNewBehavior(project, "MyExtension::MyBehavior", "CustomBehavior");
  REQUIRE(customBehavior != nullptr);
  customBehavior->UpdateProperty("numberProperty", "481.516");
  customBehavior->UpdateProperty("stringProperty", "BehaviorValue");
  customBehavior->UpdateProperty("booleanProperty", "0");

  auto* dependentBehavior = object.AddNewBehavior(
      project,
      "MyExtension::BehaviorWithRequiredBehaviorProperty",
      "DependentBehavior");
  REQUIRE(dependentBehavior != nullptr);
  dependentBehavior->UpdateProperty("requiredBehaviorProperty", "CustomBehavior");
  dependentBehavior->UpdateProperty("resourceProperty", "resource://Image.png");

  AddParameterizedStandardEvent(layout.GetEvents(),
                                "GlobalScoreA",
                                "GlobalTextA",
                                "GlobalFlagA",
                                "Player",
                                "A",
                                "100");
  AddParameterizedStandardEvent(layout.GetEvents(),
                                "GlobalScoreB",
                                "GlobalTextB",
                                "GlobalFlagB",
                                "Player",
                                "B",
                                "200");
  AddParameterizedStandardEvent(layout.GetEvents(),
                                "GlobalScoreC",
                                "GlobalTextC",
                                "GlobalFlagC",
                                "Player",
                                "C",
                                "300");

  auto& extensionA = project.InsertNewEventsFunctionsExtension("DriftExtensionA", 0);
  auto& extensionB = project.InsertNewEventsFunctionsExtension("DriftExtensionB", 1);

  auto& extensionAFunction1 =
      extensionA.GetEventsFunctions().InsertNewEventsFunction("ExtensionAFunction1", 0);
  AddParameterizedStandardEvent(extensionAFunction1.GetEvents(),
                                "ExtANumber1",
                                "ExtAText1",
                                "ExtABool1",
                                "Player",
                                "ExtA1",
                                "11");
  auto& extensionAFunction2 =
      extensionA.GetEventsFunctions().InsertNewEventsFunction("ExtensionAFunction2", 1);
  AddParameterizedStandardEvent(extensionAFunction2.GetEvents(),
                                "ExtANumber2",
                                "ExtAText2",
                                "ExtABool2",
                                "Player",
                                "ExtA2",
                                "22");

  auto& extensionBFunction1 =
      extensionB.GetEventsFunctions().InsertNewEventsFunction("ExtensionBFunction1", 0);
  AddParameterizedStandardEvent(extensionBFunction1.GetEvents(),
                                "ExtBNumber1",
                                "ExtBText1",
                                "ExtBBool1",
                                "Player",
                                "ExtB1",
                                "33");
  auto& extensionBFunction2 =
      extensionB.GetEventsFunctions().InsertNewEventsFunction("ExtensionBFunction2", 1);
  AddParameterizedStandardEvent(extensionBFunction2.GetEvents(),
                                "ExtBNumber2",
                                "ExtBText2",
                                "ExtBBool2",
                                "Player",
                                "ExtB2",
                                "44");

  auto& eventsBasedBehavior =
      extensionA.GetEventsBasedBehaviors().InsertNew("ExtensionABehavior", 0);
  eventsBasedBehavior.SetFullName("Extension A behavior");
  eventsBasedBehavior.SetDescription("Behavior used for serialization drift tests");
  eventsBasedBehavior.SetObjectType("");
  eventsBasedBehavior.GetPropertyDescriptors()
      .InsertNew("SpeedMultiplier", 0)
      .SetType("Number")
      .SetValue("1.25");
  auto& eventsBasedBehaviorFunction =
      eventsBasedBehavior.GetEventsFunctions().InsertNewEventsFunction(
          "BehaviorFunction",
          0);
  AddParameterizedStandardEvent(eventsBasedBehaviorFunction.GetEvents(),
                                "BehaviorNumber",
                                "BehaviorText",
                                "BehaviorBool",
                                "Player",
                                "Behavior",
                                "55");

  auto& eventsBasedObject =
      extensionB.GetEventsBasedObjects().InsertNew("ExtensionBObject", 0);
  eventsBasedObject.SetFullName("Extension B object");
  eventsBasedObject.SetDescription("Object used for serialization drift tests");
  eventsBasedObject.SetDefaultName("ExtensionBObject");
  eventsBasedObject.GetObjects().InsertNewObject(
      project, "MyExtension::Sprite", "InnerSprite", 0);
  auto& eventsBasedObjectFunction =
      eventsBasedObject.GetEventsFunctions().InsertNewEventsFunction(
          "ObjectFunction",
          0);
  AddParameterizedStandardEvent(eventsBasedObjectFunction.GetEvents(),
                                "ObjectNumber",
                                "ObjectText",
                                "ObjectBool",
                                "Player",
                                "Object",
                                "66");
}
}  // namespace

TEST_CASE(
    "Project serialization keeps parameter mapping stable across repeated load/save with unknown version",
    "[common]") {
  gd::Platform platform;
  gd::Project writtenProject;
  SetupProjectForParameterDriftRegression(writtenProject, platform);

  const auto expectedSnapshot = CaptureProjectSnapshot(writtenProject);

  gd::SerializerElement serializedProject;
  writtenProject.SerializeTo(serializedProject);
  SetUnknownVersion(serializedProject);

  for (std::size_t cycle = 0; cycle < 3; ++cycle) {
    INFO("Cycle " << (cycle + 1));

    gd::Project readProject;
    readProject.AddPlatform(platform);
    readProject.UnserializeFrom(serializedProject);

    const auto snapshot = CaptureProjectSnapshot(readProject);
    REQUIRE(snapshot.instructionEntries == expectedSnapshot.instructionEntries);
    REQUIRE(
        snapshot.behaviorPropertyEntries == expectedSnapshot.behaviorPropertyEntries);

    gd::SerializerElement nextSerializedProject;
    readProject.SerializeTo(nextSerializedProject);
    SetUnknownVersion(nextSerializedProject);
    serializedProject = nextSerializedProject;
  }
}
