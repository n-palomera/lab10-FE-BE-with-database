import { useEffect, useState } from "react";
import axios from "axios";
import { SignedIn, SignedOut, SignInButton, useAsgardeo } from '@asgardeo/react'

const API = import.meta.env.VITE_API_BASE_URL;
const emptyForm = { name: "", breed: "", age: "" };

const Body = () => {
  const { getAccessToken } = useAsgardeo();
  const [puppies, setPuppies]     = useState([]);
  const [form, setForm]           = useState(emptyForm);
  const [editingId, setEditingId] = useState(null);
  const [showForm, setShowForm]   = useState(false);
  const [error, setError]         = useState("");

  const authHeaders = async () => {
    const accessToken = await getAccessToken();
    console.log("Sending Authorization: Bearer", accessToken);
    return { Authorization: `Bearer ${accessToken}` };
  };

  const fetchPuppies = async () => {
    try {
      const headers = await authHeaders();
      const { data } = await axios.get(`${API}/puppies`, { headers });
      setPuppies(data);
      setError("");
    } catch {
      setError("Failed to fetch puppies.");
    }
  };

  useEffect(() => { fetchPuppies(); }, []);

  const handleChange = (e) =>
    setForm({ ...form, [e.target.name]: e.target.value });

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    try {
      const headers = await authHeaders();
      if (editingId) {
        await axios.put(`${API}/puppies/${editingId}`, form, { headers });
      } else {
        await axios.post(`${API}/puppies`, form, { headers });
      }
      setForm(emptyForm);
      setEditingId(null);
      setShowForm(false);
      fetchPuppies();
    } catch {
      setError("Failed to save puppy.");
    }
  };

  const handleEdit = (puppy) => {
    setForm({ name: puppy.name, breed: puppy.breed, age: puppy.age });
    setEditingId(puppy.id);
    setShowForm(true);
  };

  const handleDelete = async (id) => {
    if (!confirm("Delete this puppy?")) return;
    try {
      const headers = await authHeaders();
      await axios.delete(`${API}/puppies/${id}`, { headers });
      fetchPuppies();
    } catch {
      setError("Failed to delete puppy.");
    }
  };

  const handleCancel = () => {
    setForm(emptyForm);
    setEditingId(null);
    setShowForm(false);
    setError("");
  };

  return (
    <main>
      <SignedOut>
        <div className="login-card">
          <h2>Welcome to Puppy Pals</h2>
          <p>Please sign in to manage your puppies.</p>
          <SignInButton />
        </div>
      </SignedOut>

      <SignedIn>
        {error && <p className="error">{error}</p>}

        <button className="btn btn-add" onClick={() => setShowForm(!showForm)}>
          {showForm ? "Close Form" : "+ Add Puppy"}
        </button>

        {showForm && (
          <form className="puppy-form" onSubmit={handleSubmit}>
            <h2>{editingId ? "Edit Puppy" : "Add New Puppy"}</h2>
            <input name="name"  placeholder="Name"  value={form.name}  onChange={handleChange} required />
            <input name="breed" placeholder="Breed" value={form.breed} onChange={handleChange} required />
            <input name="age"   placeholder="Age"   value={form.age}   onChange={handleChange} required type="number" min="0" />
            <div className="form-buttons">
              <button className="btn btn-save" type="submit">
                {editingId ? "Update" : "Save"}
              </button>
              <button className="btn btn-cancel" type="button" onClick={handleCancel}>
                Cancel
              </button>
            </div>
          </form>
        )}

        <table>
          <thead>
            <tr>
              <th>ID</th>
              <th>Name</th>
              <th>Breed</th>
              <th>Age</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {puppies.length === 0 ? (
              <tr><td colSpan="5">No puppies found. Add one!</td></tr>
            ) : (
              puppies.map((p) => (
                <tr key={p.id}>
                  <td>{p.id}</td>
                  <td>{p.name}</td>
                  <td>{p.breed}</td>
                  <td>{p.age}</td>
                  <td>
                    <button className="btn btn-edit" onClick={() => handleEdit(p)}>Edit</button>
                    <button className="btn btn-delete" onClick={() => handleDelete(p.id)}>Delete</button>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </SignedIn>
    </main>
  );
};

export default Body;