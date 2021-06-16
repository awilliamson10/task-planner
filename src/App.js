import React, { useState, useRef, useEffect } from "react";
import Todo from "./components/Todo";
import Form from "./components/Form";
import FilterButton from "./components/FilterButton";
import { nanoid } from "nanoid";
import { API } from 'aws-amplify';
import { withAuthenticator, AmplifySignOut } from '@aws-amplify/ui-react'
import { listTasks } from './graphql/queries';
import * as mutations from './graphql/mutations';


function usePrevious(value) {
  const ref = useRef();
  useEffect(() => {
    ref.current = value;
  });
  return ref.current;
}

const FILTER_MAP = {
  All: () => true,
  Active: task => !task.completed,
  Completed: task => task.completed
};

const FILTER_NAMES = Object.keys(FILTER_MAP);

function App() {
  const [tasks, setTasks] = useState([]);
  const [filter, setFilter] = useState('All');

  useEffect(() => {
    fetchTasks();
  }, []);

  async function fetchTasks() {
    const apiData = await API.graphql({ query: listTasks });
    setTasks(apiData.data.listTasks.items);
  }

  async function toggleTaskCompleted(id) {
    var index = 0;
    var i = null;
    const updatedTasks = tasks.map(task => {
      index++;
      if (id === task.id) {
        i = index;
        return {...task, completed: !task.completed}
      }
      return task;
    });
    setTasks(updatedTasks);
    const upTask = {
      id: tasks[[i-1]].id,
      name: tasks[[i-1]].name,
      completed: !tasks[[i-1]].completed
    }
    await API.graphql({ query: mutations.updateTask, variables: { input: upTask } });
  }

  async function deleteTask(id) {
    const remainingTasks = tasks.filter(task => id !== task.id);
    setTasks(remainingTasks);
    await API.graphql({ query: mutations.deleteTask, variables: { input: { id } }});
  }

  async function editTask(id, newName) {
    var index = 0;
    var i = null;
    const editedTaskList = tasks.map(task => {
      index++;
      if (id === task.id) {
        i = index;
        return {...task, name: newName}
      }
      return task;
    });
    setTasks(editedTaskList);
    const upTask = {
      id: tasks[[i-1]].id,
      name: newName,
      completed: !tasks[[i-1]].completed
    }
    await API.graphql({ query: mutations.updateTask, variables: { input: upTask } });
  }

  const taskList = tasks
    .filter(FILTER_MAP[filter])
    .map(task => (
      <Todo 
        id={task.id} 
        name={task.name} 
        completed={task.completed}
        key={task.id}
        toggleTaskCompleted={toggleTaskCompleted}   
        deleteTask={deleteTask}
        editTask={editTask}
      />
  ));

  const filterList = FILTER_NAMES.map(name => (
    <FilterButton 
      key={name} 
      name={name}
      isPressed={name === filter}
      setFilter={setFilter}
    />
  ));

  async function addTask(name) {
    const newTask = {id: "todo-" + nanoid(), name: name, completed: false};
    await API.graphql({ query: mutations.createTask, variables: { input: newTask } });
    setTasks([...tasks, newTask]);
  }

  const tasksNoun = taskList.length !== 1 ? 'tasks' : 'task';
  const headingText = `${taskList.length} ${tasksNoun} remaining`;
  const listHeadingRef = useRef(null);
  const prevTaskLength = usePrevious(tasks.length);

  useEffect(() => {
    if (tasks.length - prevTaskLength === -1) {
      listHeadingRef.current.focus();
    }
  }, [tasks.length, prevTaskLength]);

  return (
    <div className="todoapp stack-large">
      <h1>Task Planner</h1>
      <Form addTask={addTask}/>
      <div className="filters btn-group stack-exception">
        {filterList}
      </div>
      <h2 id="list-heading" tabIndex="-1" ref={listHeadingRef}>
        {headingText}
      </h2>
      <ul
        role="list"
        className="todo-list stack-large stack-exception"
        aria-labelledby="list-heading"
      >
        {taskList}
      </ul>
      <br />
      <AmplifySignOut />
    </div>
  );
}

export default withAuthenticator(App);
